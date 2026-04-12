// FILE: app/api/generate-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.4,
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { milestoneTitle, milestoneDescription } = await req.json();

    if (!milestoneTitle) {
      return NextResponse.json({ error: 'Missing milestone info' }, { status: 400 });
    }

    const prompt = `You are an expert technical instructor. Generate exactly 5 multiple-choice questions to thoroughly test understanding of:

TOPIC: ${milestoneTitle}
CONTEXT: ${milestoneDescription || 'Core concepts and practical application'}

STRICT RULES:
1. Each question must test a SPECIFIC, DISTINCT concept from the topic
2. No two questions can test the same concept
3. Questions must be contextually relevant — not generic
4. Difficulty distribution: Q1=easy, Q2=easy, Q3=medium, Q4=medium, Q5=hard
5. All 4 options must be plausible (no obviously wrong answers)
6. Explanation must clearly justify WHY the correct answer is right AND why others are wrong

Return ONLY a valid JSON array with NO markdown fences or preamble:
[
  {
    "question": "Specific question about ${milestoneTitle}?",
    "options": ["Correct or incorrect option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Detailed explanation of why this answer is correct and what concept it tests.",
    "difficulty": "easy"
  }
]`;

    const result = await llm.invoke([new SystemMessage(prompt)]);
    const raw = result.content.toString().replace(/```json|```/g, "").trim();

    // Robust JSON extraction
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");

    const questions = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid question array");
    }

    // Validate and normalise each question
    const validated = questions.slice(0, 5).map((q: any, i: number) => ({
      question: q.question || `Question ${i + 1}: What is a key concept in ${milestoneTitle}?`,
      options: Array.isArray(q.options) && q.options.length === 4
        ? q.options
        : ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
        ? q.correctIndex
        : 0,
      explanation: q.explanation || "This is the correct answer based on the topic fundamentals.",
      difficulty: q.difficulty || (i < 2 ? "easy" : i < 4 ? "medium" : "hard"),
    }));

    // Pad to 5 if fewer returned
    while (validated.length < 5) {
      const idx = validated.length;
      validated.push({
        question: `What is an important aspect of ${milestoneTitle}? (Q${idx + 1})`,
        options: [
          "Understanding the core fundamentals",
          "Skipping foundational concepts",
          "Memorising syntax without context",
          "Avoiding hands-on practice",
        ],
        correctIndex: 0,
        explanation: "Understanding core fundamentals is the foundation of any technical topic.",
        difficulty: idx < 2 ? "easy" : idx < 4 ? "medium" : "hard",
      });
    }

    return NextResponse.json({ success: true, questions: validated });

  } catch (e: any) {
    console.error("Test generation error:", e);

    // Fallback: return 5 generic questions so UI never breaks
    const { milestoneTitle: title = "this topic" } = await req.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      questions: Array.from({ length: 5 }, (_, i) => ({
        question: `Which of the following best describes a core concept in ${title}? (Q${i + 1})`,
        options: [
          "Applying the concept in real-world scenarios",
          "Ignoring best practices",
          "Avoiding documentation",
          "Writing code without testing",
        ],
        correctIndex: 0,
        explanation: "Applying concepts in practice is fundamental to mastering any technical topic.",
        difficulty: i < 2 ? "easy" : i < 4 ? "medium" : "hard",
      })),
    });
  }
}