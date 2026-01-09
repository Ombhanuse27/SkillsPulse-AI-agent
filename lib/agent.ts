import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0, 
});

const resumeSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.object({
    category: z.string().optional(),
    name: z.string().describe("Standardized skill name (e.g. 'Golang' instead of 'Go')")
  })),
  experience: z.array(z.object({
    role: z.string(),
    company: z.string(),
    duration: z.string().optional(),
    description: z.string()
  })),
  projects: z.array(z.object({
    title: z.string(),
    techStack: z.array(z.string()),
    description: z.string()
  })),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.string().optional()
  }))
});

const parser = StructuredOutputParser.fromZodSchema(resumeSchema);

export async function extractStructuredData(rawText: string) {
  const prompt = new PromptTemplate({
    template: `
      You are an expert Resume Parser. 
      Extract structured data from the text below.

      CRITICAL INSTRUCTION - DATA NORMALIZATION:
      1. **Standardize Skill Names**: Convert all skills to their "Industry Standard" name.
         - *Example:* If text says "Go", output "Golang".
         - *Example:* If text says "Reactjs" or "React.js", output "React".
         - *Example:* If text says "Amazon Web Services", output "AWS".
      2. **Parsing Fixes**: Split glued words (e.g., "Docker,Kubernetes" -> "Docker", "Kubernetes").
      3. **Hallucination Check**: Only list skills EXPLICITLY mentioned. Do not infer "Redis" just because "Node" is there.

      RESUME TEXT:
      {text}
      
      {format_instructions}
    `,
    inputVariables: ["text"],
    partialVariables: { format_instructions: parser.getFormatInstructions() },
  });

  const chain = prompt.pipe(model).pipe(parser);

  try {
    return await chain.invoke({ text: rawText.slice(0, 25000) });
  } catch (error) {
    console.error("Agent Extraction Failed:", error);
    throw new Error("AI failed to process resume structure");
  }
}