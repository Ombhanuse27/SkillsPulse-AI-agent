import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser();

      // Silence internal library warnings
      console.warn = () => {};

      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        let extractedText = "";

        // 1. LOCATE PAGES (Handle structure variations safely)
        const pages = pdfData.Pages || (pdfData.formImage && pdfData.formImage.Pages);
        
        if (!pages) {
            console.error("❌ PDF Structure Mismatch. Keys found:", Object.keys(pdfData));
            reject("Could not read PDF structure");
            return;
        }

        // 2. EXTRACT TEXT SAFELY
        pages.forEach((page: any) => {
          page.Texts.forEach((textItem: any) => {
             textItem.R.forEach((t: any) => {
               let str = "";
               
               // --- CRASH PROOF DECODING ---
               try {
                 // Try to decode standard URL-encoded text
                 str = decodeURIComponent(t.T);
               } catch (e) {
                 // If it crashes (e.g., due to "82.74%"), just use the raw text
                 str = t.T;
               }

               // Force a space after every word to prevent merging (e.g. "ReactNode")
               extractedText += str + " ";
             });
          });
          extractedText += "\n";
        });
        
        // 3. INTELLIGENT CLEANING
        // Fixes common spacing errors caused by PDF parsing
        const cleaned = extractedText
          .replace(/No\s+de\.js/gi, "Node.js")      // Fix "No de.js"
          .replace(/React\s+\.js/gi, "React.js")    // Fix "React .js"
          .replace(/C\s+entralized/gi, "Centralized")
          .replace(/Ex\s+perience/gi, "Experience")
          .replace(/%20/g, " ") // Catch any remaining encoded spaces
          .replace(/\s+/g, " ") // Collapse multiple spaces into one
          .trim();

        // Debug: Log success
        console.log("✅ Parsed Successfully. Preview:", cleaned.slice(0, 100));
        
        resolve(cleaned);
      });

      pdfParser.parseBuffer(buffer);
    });

    return NextResponse.json({ text });
    
  } catch (error) {
    console.error("PDF Parse Error:", error);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}