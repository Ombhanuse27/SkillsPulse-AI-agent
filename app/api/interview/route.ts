import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  processInterviewTurn,
  generateHint,
  generateFinalReport,
} from "@/lib/interview-agent";

const prisma = new PrismaClient();

// Helper: try to create a session with all new fields; fall back to base fields
// if the migration hasn't been run yet (Prisma will throw a validation error).
async function upsertSession(id: string | undefined, role: string, type: string, difficulty: string, topics?: string) {
  const baseData = {
    role: role   || "General Software Engineer",
    type: type   || "TECHNICAL",
  };

  const fullData = {
    ...baseData,
    difficulty: difficulty || "MID",
    topics:     topics     || null,
  };

  if (id) {
    // Check if session already exists
    const existing = await prisma.interviewSession.findUnique({ where: { id } });
    if (existing) return id; // already there — no action needed

    // Try with new fields first, fall back to base fields if schema isn't migrated
    try {
      await prisma.interviewSession.create({ data: { id, ...fullData } });
    } catch {
      await prisma.interviewSession.create({ data: { id, ...baseData } });
    }
    return id;
  } else {
    // No client-supplied ID — let Prisma auto-generate one
    try {
      const s = await prisma.interviewSession.create({ data: fullData });
      return s.id;
    } catch {
      const s = await prisma.interviewSession.create({ data: baseData });
      return s.id;
    }
  }
}

// Helper: try to mark session completed with summary; silently skip if columns missing
async function completeSession(id: string, summary: object) {
  try {
    await prisma.interviewSession.update({
      where: { id },
      data:  { status: "COMPLETED", summary },
    });
  } catch {
    // Columns don't exist yet — migration pending; silently ignore
  }
}

// Helper: create a message with new fields, falling back if columns don't exist
async function createMessage(data: {
  sessionId:      string;
  sender:         string;
  content:        string;
  metrics?:       object;
  questionNumber?: number;
  isHint?:        boolean;
}) {
  const base = {
    sessionId: data.sessionId,
    sender:    data.sender,
    content:   data.content,
    metrics:   data.metrics,
  };
  try {
    await prisma.interviewMessage.create({
      data: {
        ...base,
        questionNumber: data.questionNumber,
        isHint:         data.isHint ?? false,
      },
    });
  } catch {
    // Fallback: create without new columns
    await prisma.interviewMessage.create({ data: base });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action = "answer",
      userAnswer,
      currentQuestion,
    } = body;

    let {
      sessionId,
      role,
      interviewType,
      difficulty,
      topics,
      questionNumber,
      maxQuestions,
      hintUsed,
    } = body;

    // ── HINT ACTION ─────────────────────────────────────────────────────────────
    if (action === "hint") {
      const hintResult = await generateHint({
        currentQuestion: currentQuestion || "",
        jobRole:         role            || "Software Engineer",
        interviewType:   interviewType   || "TECHNICAL",
        difficulty:      difficulty      || "MID",
      });
      return NextResponse.json(hintResult);
    }

    // ── ANSWER ACTION ────────────────────────────────────────────────────────────

    // Step 1: Ensure session exists (handles both migrated and non-migrated schemas)
    sessionId = await upsertSession(sessionId, role, interviewType, difficulty, topics);

    // Step 2: Save user's answer
    await createMessage({
      sessionId,
      sender:         "USER",
      content:        userAnswer,
      questionNumber: questionNumber || 1,
      isHint:         false,
    });

    // Step 3: Fetch recent context for the AI
    const recentMessages = await prisma.interviewMessage.findMany({
      where:   { sessionId },
      orderBy: { createdAt: "desc" },
      take:    8,
    });

    const history = recentMessages
      .reverse()
      .map(m => `${m.sender}: ${m.content}`);

    // Step 4: AI evaluation
    const aiResponse = await processInterviewTurn({
      currentQuestion: currentQuestion || "Introduction",
      userAnswer,
      history,
      jobRole:        role          || "Software Engineer",
      interviewType:  interviewType || "TECHNICAL",
      difficulty:     difficulty    || "MID",
      topics,
      questionNumber: questionNumber  || 1,
      maxQuestions:   maxQuestions    || 7,
      hintUsed:       hintUsed        || false,
    });

    // Step 5: Save AI response
    await createMessage({
      sessionId,
      sender:         "AI",
      content:        aiResponse.nextQuestion,
      questionNumber: (questionNumber || 1) + 1,
      isHint:         false,
      metrics: {
        score:         aiResponse.score,
        feedback:      aiResponse.feedback,
        betterAnswer:  aiResponse.betterAnswer,
        topicsCovered: aiResponse.topicsCovered,
      },
    });

    // Step 6: Generate final report if interview is over
    let finalReport = null;

    if (aiResponse.isInterviewOver) {
      const allMessages = await prisma.interviewMessage.findMany({
        where:   { sessionId },
        orderBy: { createdAt: "asc" },
      });

      const fullHistory = allMessages.map(m => `${m.sender}: ${m.content}`);

      const allScores = allMessages
        .filter(m => m.sender === "AI" && m.metrics)
        .map(m => (m.metrics as { score?: number })?.score ?? 0)
        .filter(s => s > 0);

      const finalScores = allScores.length ? allScores : [aiResponse.score];

      finalReport = await generateFinalReport({
        history:       fullHistory,
        jobRole:       role          || "Software Engineer",
        interviewType: interviewType || "TECHNICAL",
        difficulty:    difficulty    || "MID",
        scores:        finalScores,
      });

      // Persist report (silently skips if columns aren't migrated yet)
      await completeSession(sessionId, finalReport as object);
    }

    return NextResponse.json({ ...aiResponse, sessionId, finalReport });

  } catch (error) {
    console.error("Interview Route Error:", error);
    return NextResponse.json(
      { error: "Failed to process interview turn" },
      { status: 500 }
    );
  }
}