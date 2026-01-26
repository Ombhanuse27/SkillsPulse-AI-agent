import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.6, // Slightly higher for conversational variety
});

// The AI response structure for every turn
const interviewTurnSchema = z.object({
  feedback: z.string().describe("Critique of the user's previous answer. Keep it concise."),
  score: z.number().describe("Score from 1-100 based on technical accuracy and clarity."),
  betterAnswer: z.string().describe("A brief example of a stronger answer (Star method or code concept)."),
  nextQuestion: z.string().describe("The next follow-up question to ask the candidate."),
  isInterviewOver: z.boolean().describe("True if 5 questions have been asked."),
});

const parser = StructuredOutputParser.fromZodSchema(interviewTurnSchema);

export async function processInterviewTurn(
  currentQuestion: string, 
  userAnswer: string, 
  history: string[], 
  jobRole: string
) {
  const prompt = new PromptTemplate({
    template: `
      You are a strict but helpful Technical Interviewer for the role of: {jobRole}.
      
      CONTEXT:
      - Current Question Asked: "{currentQuestion}"
      - User's Answer: "{userAnswer}"
      - Conversation History: {history}

      YOUR GOAL:
      1. Evaluate the User's Answer strictly.
      2. Provide a score (0-100) and constructive feedback.
      3. Suggest how to improve the answer.
      4. Generate the NEXT question. If the user struggled, ask a simpler follow-up. If they did well, dig deeper.
      
      {format_instructions}
    `,
    inputVariables: ["jobRole", "currentQuestion", "userAnswer", "history"],
    partialVariables: { format_instructions: parser.getFormatInstructions() },
  });

  const chain = prompt.pipe(model).pipe(parser);

  try {
    return await chain.invoke({ 
      jobRole, 
      currentQuestion, 
      userAnswer,
      history: history.join("\n")
    });
  } catch (error) {
    console.error("Interview Agent Failed:", error);
    throw new Error("AI failed to evaluate answer");
  }
}