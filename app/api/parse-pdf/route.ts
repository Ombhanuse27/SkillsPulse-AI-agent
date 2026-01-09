import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { PrismaClient } from "@prisma/client";
import { extractStructuredData } from "@/lib/agent";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 1. ROBUST TEXT EXTRACTION
    const rawText = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
      
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        const text = pdfData.Pages
          .map((page: any) => 
            page.Texts.map((t: any) => {
              try {
                return decodeURIComponent(t.R[0].T);
              } catch (e) {
                return t.R[0].T;
              }
            }).join("  ") // Double space between words in a line
          )
          .join("\n\n") // Double newline between blocks to prevent merging
          .replace(/,/g, ", ") // Ensure commas have spaces after them
          .replace(/\s+/g, " "); // Finally, collapse excessive whitespace
          
        resolve(text);
      });

      pdfParser.parseBuffer(buffer);
    });

    // 2. AI AGENT (Normalizes Data)
    const structured = await extractStructuredData(rawText);

    // 3. DB SAVE
    const savedResume = await prisma.resume.create({
      data: {
        fullName: structured.fullName,
        email: structured.email,
        summary: structured.summary,
        skills: { create: structured.skills },
        experiences: { create: structured.experience },
        projects: { create: structured.projects },
        educations: { create: structured.education }
      }
    });

    return NextResponse.json({ text: rawText, resumeId: savedResume.id });

  } catch (error) {
    console.error("Parse Error:", error);
    return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
  }
}