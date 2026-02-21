import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.6,
});

// ─── Schemas ────────────────────────────────────────────────────────────────────

const interviewTurnSchema = z.object({
  feedback: z.string().describe(
    "Specific, actionable critique of the candidate's answer. Mention what was good AND what was missing. Be concise — 2-3 sentences max."
  ),
  score: z.number().min(0).max(100).describe(
    "Score from 0-100. Be strict but fair. Scoring criteria: technical accuracy (40%), clarity & communication (30%), completeness (30%). If a hint was used, cap the max score at 75."
  ),
  betterAnswer: z.string().describe(
    "A concise model answer showing best practices. Use STAR method for behavioral questions, pseudocode/concepts for technical, and trade-off analysis for system design."
  ),
  nextQuestion: z.string().describe(
    "The next interview question to ask. If previous score < 60, ask a simpler follow-up. If score > 80, dig deeper. Vary question types to keep the interview engaging."
  ),
  isInterviewOver: z.boolean().describe(
    "Set to true ONLY when the question number equals or exceeds maxQuestions."
  ),
  topicsCovered: z.array(z.string()).describe(
    "1-3 specific technical skills or concepts assessed in this exchange (e.g., 'React Hooks', 'Big O Notation', 'API Design', 'Leadership', 'Conflict Resolution')."
  ),
  questionNumber: z.number().describe("The sequential number of the question just answered."),
});

const hintSchema = z.object({
  hint: z.string().describe(
    "A helpful nudge (under 50 words) that points to the key concept or framework WITHOUT giving away the full answer. Encourage structured thinking."
  ),
});

const finalReportSchema = z.object({
  overallScore: z.number().min(0).max(100).describe(
    "Weighted average score across all questions, considering question difficulty."
  ),
  strengths: z.array(z.string()).min(2).max(5).describe(
    "3-5 specific, evidence-based strengths demonstrated during the interview."
  ),
  weaknesses: z.array(z.string()).min(2).max(5).describe(
    "3-5 specific areas that need improvement, with brief explanation of why."
  ),
  topicBreakdown: z.array(z.object({
    topic: z.string(),
    score: z.number().min(0).max(100),
  })).describe("Score breakdown by topic area covered during the interview."),
  recommendation: z.string().describe(
    "2-3 sentence hiring recommendation with concrete reasoning based on the interview performance."
  ),
  nextSteps: z.array(z.string()).min(3).max(5).describe(
    "4-5 specific, actionable steps the candidate should take to improve their skills and interview performance."
  ),
  hiringSuggestion: z.enum(["Strong Hire", "Hire", "No Hire", "Strong No Hire"]).describe(
    "Final hiring recommendation based on overall performance, technical depth, and communication quality."
  ),
});

const interviewTurnParser = StructuredOutputParser.fromZodSchema(interviewTurnSchema);
const hintParser           = StructuredOutputParser.fromZodSchema(hintSchema);
const finalReportParser    = StructuredOutputParser.fromZodSchema(finalReportSchema);

// ─── Type & Difficulty Guidance Maps ────────────────────────────────────────────

const TYPE_GUIDANCE: Record<string, string> = {
  TECHNICAL:
    "Focus on coding patterns, algorithms, data structures, language-specific knowledge, and software engineering best practices. Ask about code quality, testing, and debugging approaches.",
  BEHAVIORAL:
    "Use the STAR method (Situation, Task, Action, Result) framework to evaluate soft skills, leadership, collaboration, conflict resolution, and culture fit. Look for specific, quantifiable outcomes.",
  SYSTEM_DESIGN:
    "Evaluate architecture decisions, scalability thinking, trade-off analysis, database selection, caching strategies, API design, and distributed systems knowledge. Ask candidates to explain their reasoning.",
  MIXED:
    "Alternate intelligently between technical questions, behavioral scenarios, and system design challenges based on the candidate's responses and the role requirements.",
};

const DIFFICULTY_GUIDANCE: Record<string, string> = {
  JUNIOR:
    "Ask foundational questions. Expect basic syntax knowledge, simple algorithms (O(n²) or better), CRUD operations, and entry-level system awareness. Be encouraging.",
  MID:
    "Ask intermediate questions. Expect solid understanding of patterns, moderate algorithm complexity, REST APIs, database design, and some architectural awareness.",
  SENIOR:
    "Ask advanced questions. Expect deep domain expertise, system thinking, trade-off analysis, performance optimization, and strong examples of leadership and mentorship.",
  STAFF:
    "Ask staff-level questions covering org-wide technical strategy, cross-team coordination, complex distributed systems, mentorship at scale, and business impact thinking.",
};

// ─── Process Interview Turn ──────────────────────────────────────────────────────

export async function processInterviewTurn({
  currentQuestion,
  userAnswer,
  history,
  jobRole,
  interviewType,
  difficulty,
  topics,
  questionNumber,
  maxQuestions,
  hintUsed = false,
}: {
  currentQuestion: string;
  userAnswer: string;
  history: string[];
  jobRole: string;
  interviewType: string;
  difficulty: string;
  topics?: string;
  questionNumber: number;
  maxQuestions: number;
  hintUsed?: boolean;
}) {
  const prompt = new PromptTemplate({
    template: `You are a rigorous but fair Technical Interviewer at a top-tier tech company, interviewing a candidate for: {jobRole}.

INTERVIEW CONFIGURATION:
- Interview Type: {interviewType}
  Guidance: {typeGuidance}
- Seniority Level: {difficulty}
  Guidance: {difficultyGuidance}
- Focus Topics: {topics}
- Question Progress: {questionNumber} of {maxQuestions}
- Hint was used by candidate: {hintUsed}

RECENT CONVERSATION:
{history}

CURRENT QUESTION ASKED:
"{currentQuestion}"

CANDIDATE'S ANSWER:
"{userAnswer}"

EVALUATION INSTRUCTIONS:
1. Score the answer strictly based on the interview type and seniority level.
2. If the candidate used a hint, cap the maximum possible score at 75.
3. Generate the next question: go harder if score > 80, stay same if 60-80, go easier if score < 60.
4. Set isInterviewOver = true ONLY if {questionNumber} >= {maxQuestions}.
5. Keep follow-up questions focused on: {topics} (if specified).
6. For BEHAVIORAL type: check if candidate used STAR method. Deduct points if they didn't.
7. For TECHNICAL type: check for time/space complexity awareness. Deduct if absent for algorithm questions.
8. For SYSTEM_DESIGN type: check if candidate considered scalability, failure modes, and trade-offs.

{format_instructions}`,
    inputVariables: [
      "jobRole", "interviewType", "typeGuidance", "difficulty", "difficultyGuidance",
      "topics", "questionNumber", "maxQuestions", "history", "currentQuestion", "userAnswer", "hintUsed",
    ],
    partialVariables: { format_instructions: interviewTurnParser.getFormatInstructions() },
  });

  const chain = prompt.pipe(model).pipe(interviewTurnParser);

  try {
    return await chain.invoke({
      jobRole,
      interviewType,
      typeGuidance:       TYPE_GUIDANCE[interviewType]       || TYPE_GUIDANCE.MIXED,
      difficulty,
      difficultyGuidance: DIFFICULTY_GUIDANCE[difficulty]    || DIFFICULTY_GUIDANCE.MID,
      topics:             topics || "General topics relevant to the role",
      questionNumber:     String(questionNumber),
      maxQuestions:       String(maxQuestions),
      history:            history.slice(-8).join("\n") || "No prior history.",
      currentQuestion,
      userAnswer,
      hintUsed:           hintUsed ? "YES — cap score at 75 maximum" : "NO",
    });
  } catch (error) {
    console.error("Interview Turn Failed:", error);
    throw new Error("AI failed to evaluate answer");
  }
}

// ─── Generate Hint ────────────────────────────────────────────────────────────────

export async function generateHint({
  currentQuestion,
  jobRole,
  interviewType,
  difficulty,
}: {
  currentQuestion: string;
  jobRole: string;
  interviewType: string;
  difficulty: string;
}) {
  const prompt = new PromptTemplate({
    template: `You are a supportive interview coach for a {difficulty} {interviewType} interview for the role of {jobRole}.

The candidate is struggling with this question:
"{currentQuestion}"

Provide a subtle, guiding hint that:
- Points toward the right concept, framework, or structure WITHOUT giving away the full answer
- Is calibrated for {difficulty} level (don't over-hint for senior roles)
- For TECHNICAL: hint at the algorithm pattern or data structure to use
- For BEHAVIORAL: remind them of the STAR method structure
- For SYSTEM_DESIGN: suggest a starting point (e.g., "Think about the core entities first")
- Stays under 60 words

{format_instructions}`,
    inputVariables: ["jobRole", "difficulty", "interviewType", "currentQuestion"],
    partialVariables: { format_instructions: hintParser.getFormatInstructions() },
  });

  const chain = prompt.pipe(model).pipe(hintParser);

  try {
    return await chain.invoke({ jobRole, difficulty, interviewType, currentQuestion });
  } catch (error) {
    console.error("Hint Generation Failed:", error);
    throw new Error("Failed to generate hint");
  }
}

// ─── Generate Final Report ─────────────────────────────────────────────────────────

export async function generateFinalReport({
  history,
  jobRole,
  interviewType,
  difficulty,
  scores,
}: {
  history: string[];
  jobRole: string;
  interviewType: string;
  difficulty: string;
  scores: number[];
}) {
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const prompt = new PromptTemplate({
    template: `You are a senior hiring manager at a top tech company reviewing a completed {interviewType} interview for the role of {jobRole} ({difficulty} level).

FULL INTERVIEW TRANSCRIPT:
{history}

SCORES PER QUESTION: {scores}
AVERAGE SCORE: {avgScore}/100
TOTAL QUESTIONS: {totalQuestions}

Generate a comprehensive, honest, and actionable final interview report. Base your analysis entirely on the transcript — cite specific examples where possible. Be constructive but honest.

For the hiring suggestion:
- "Strong Hire": avg ≥ 85 with consistent depth
- "Hire": avg 70-84 with solid fundamentals
- "No Hire": avg 50-69 with notable gaps
- "Strong No Hire": avg < 50 or critical knowledge missing

{format_instructions}`,
    inputVariables: [
      "jobRole", "interviewType", "difficulty", "history",
      "scores", "avgScore", "totalQuestions",
    ],
    partialVariables: { format_instructions: finalReportParser.getFormatInstructions() },
  });

  const chain = prompt.pipe(model).pipe(finalReportParser);

  try {
    return await chain.invoke({
      jobRole,
      interviewType,
      difficulty,
      history:        history.join("\n"),
      scores:         scores.join(", "),
      avgScore:       String(avgScore),
      totalQuestions: String(scores.length),
    });
  } catch (error) {
    console.error("Final Report Generation Failed:", error);
    throw new Error("Failed to generate final report");
  }
}