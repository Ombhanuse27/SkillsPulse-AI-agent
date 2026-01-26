import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { extractStructuredData } from "@/lib/agent";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ✅ IMPORTANT FIX: import core parser ONLY
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;

    const data = await pdfParse(buffer);
    const rawText = data.text;

    console.log("RAW TEXT LENGTH:", rawText.length);

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "No readable text found in PDF. Please upload a text-based resume." },
        { status: 400 }
      );
    }

    const structured = await extractStructuredData(rawText);

    const savedResume = await prisma.resume.create({
      data: {
        fullName: structured.fullName,
        email: structured.email,
        summary: structured.summary,
        skills: { create: structured.skills },
        experiences: { create: structured.experience },
        projects: { create: structured.projects },
        educations: { create: structured.education },
      },
    });

    return NextResponse.json({
      text: rawText,
      resumeId: savedResume.id,
    });
  } catch (error) {
    console.error("Parse Error:", error);
    return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
  }
}
