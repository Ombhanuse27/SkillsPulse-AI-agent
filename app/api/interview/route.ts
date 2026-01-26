import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { processInterviewTurn } from "@/lib/interview-agent";


const prisma = new PrismaClient();
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userAnswer, currentQuestion } = body;
    let { sessionId, role } = body;

    // --- STEP 1: Ensure Session Exists ---
    // The frontend might send a locally generated UUID that isn't in the DB yet.
    
    if (sessionId) {
      const existingSession = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!existingSession) {
        // Client sent an ID, but DB doesn't have it. Create it now.
        console.log(`Creating new session for ID: ${sessionId}`);
        await prisma.interviewSession.create({
          data: {
            id: sessionId, // Use the ID the client provided to keep them in sync
            role: role || "General Software Engineer",
            type: "TECHNICAL",
          },
        });
      }
    } else {
      // No ID provided? Create a brand new one.
      const newSession = await prisma.interviewSession.create({
        data: {
          role: role || "General Software Engineer",
          type: "TECHNICAL",
        },
      });
      sessionId = newSession.id;
    }

    // --- STEP 2: Save User Answer ---
    // Now safe because we guaranteed the 'sessionId' exists above.
    await prisma.interviewMessage.create({
      data: {
        sessionId,
        sender: "USER",
        content: userAnswer,
      },
    });

    // --- STEP 3: Fetch Context & Process with AI ---
    const recentMessages = await prisma.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    // Convert to history format for the AI
    const history = recentMessages
      .reverse()
      .map((m) => `${m.sender}: ${m.content}`);

    // AI Agent Call
    const aiResponse = await processInterviewTurn(
      currentQuestion || "Introduction",
      userAnswer,
      history,
      role || "Software Engineer"
    );

    // --- STEP 4: Save AI Response ---
    await prisma.interviewMessage.create({
      data: {
        sessionId,
        sender: "AI",
        content: aiResponse.nextQuestion,
        metrics: {
          feedback: aiResponse.feedback,
          score: aiResponse.score,
          betterAnswer: aiResponse.betterAnswer,
        },
      },
    });

    return NextResponse.json({ ...aiResponse, sessionId });

  } catch (error) {
    console.error("Interview Route Error:", error);
    return NextResponse.json(
      { error: "Failed to process interview turn" },
      { status: 500 }
    );
  }
}