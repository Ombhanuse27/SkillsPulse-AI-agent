import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { ApolloServer } from "@apollo/server";
import { gql } from "graphql-tag";
import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const typeDefs = gql`
  type Resource {
    title: String
    url: String
    type: String
  }

  type WeekPlan {
    week: String
    goal: String
    tasks: [String]
    resources: [Resource]
  }

  type AtsFix {
    original: String
    improved: String
    reason: String
  }
  
  type QuizQuestion {
    question: String
    options: [String]
    correctAnswer: Int
    explanation: String
  }

  type ProjectScaffold {
    projectName: String
    folderStructure: String
    installCommands: String
    readmeContent: String
    steps: [String] # 🔥 Step-by-step implementation guide
  }

  type Analysis {
    score: Int
    status: String
    summary: String
    topMissingSkills: [String]
    recommendedStack: String
    roadmap: [WeekPlan] # 🔥 7-Week Mastery Plan
    atsFixes: [AtsFix]
    projectIdea: String
    interviewPrep: String
  }

  type Query { hello: String }

  type Mutation {
    analyzeApplication(resumeText: String!, jobDescription: String!, jobRole: String!): Analysis
    generateQuiz(topic: String!, jobRole: String!): [QuizQuestion]
    generateScaffold(techStack: String!, projectIdea: String!): ProjectScaffold
  }
`;

const resolvers = {
  Mutation: {
    // 1. ANALYSIS ENGINE (7-Week Mastery Focus)
    analyzeApplication: async (_: any, { resumeText, jobDescription, jobRole }: any) => {
      const prompt = `
        You are a Senior Technical Mentor.
        TARGET ROLE: ${jobRole}
        JD: "${jobDescription.slice(0, 3000)}"
        RESUME: "${resumeText.slice(0, 15000)}"

        YOUR MISSION:
        1. **GAP ANALYSIS**: Strictly identify skills in the JD that are missing or weak in the Resume (listed but not used in projects).
        2. **TECH STACK**: Recommend a modern, production-grade stack (e.g., "Go, Chi, Docker, Postgres") to build a project that fills these gaps.
        
        3. **7-WEEK MASTERY ROADMAP**: Create a detailed 7-week plan to take the candidate from 0% to 80% proficiency.
           - Weeks 1-2: Core Syntax & Foundations.
           - Weeks 3-4: Advanced Concepts (Concurrency, Memory Management, Patterns).
           - Weeks 5-6: Architecture (Microservices/Clean Arch) & Database Design.
           - Week 7: Deployment, CI/CD, and Cloud.
           - **RESOURCES**: Include real, searchable links (YouTube/Docs) for each week.

        4. **ATS IMPROVEMENT**: Rewrite 2 weak resume bullet points to be metric-driven and professional.

        5. **PROJECT IDEA**: Suggest a specific "Capstone Project" name and description that proves the missing skills.

        OUTPUT JSON ONLY (Strict Schema):
        {
          "score": <0-100>,
          "status": "<'Strong'|'Good'|'Weak'>",
          "summary": "<3-sentence strategic analysis>",
          "topMissingSkills": ["<Skill 1>", "<Skill 2>"],
          "recommendedStack": "<Tech Stack>",
          "projectIdea": "<Name and 2-sentence description of the Capstone Project>",
          "roadmap": [
             { 
               "week": "Week 1", 
               "goal": "<Clear Technical Goal>", 
               "tasks": ["<Task 1>", "<Task 2>"], 
               "resources": [{ "title": "<Resource Title>", "url": "https://www.google.com/search?q=<Query>", "type": "Video" }] 
             }
             // Ensure 7 items
          ],
          "atsFixes": [
             { "original": "...", "improved": "...", "reason": "..." }
          ],
          "interviewPrep": "<Hard Scenario Question>"
        }
      `;

      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "You are a JSON-only Career Agent." },
            { role: "user", content: prompt },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");

        await prisma.analysisResult.create({
          data: {
            role: jobRole,
            jobDescription,
            resumeText,
            score: aiResponse.score,
            status: aiResponse.status,
            feedback: aiResponse
          }
        });

        return aiResponse;
      } catch (error) {
        console.error("AI Error:", error);
        throw new Error("AI Agent Failed");
      }
    },

    // 2. PROJECT SCAFFOLDER (Nested Structure & Steps)
    generateScaffold: async (_: any, { techStack, projectIdea }: any) => {
      const prompt = `
        You are a Senior Software Architect.
        Task: Create a production-ready starter kit for the project: "${projectIdea}".
        Stack: "${techStack}"

        REQUIREMENTS:
        1. **Folder Structure**: Must be detailed and nested to show Domain-Driven Design (DDD) or Clean Architecture.
           - Example: src/features/auth/controllers/login.controller.ts
        2. **Steps**: Provide a numbered list of execution steps (1 to 10) to build the MVP.

        Output JSON:
        {
          "projectName": "skillpulse-capstone",
          "folderStructure": "src/\n  config/\n    db.ts\n  features/\n    auth/\n      services/...", 
          "installCommands": "npm init -y && npm install ...",
          "readmeContent": "# Project Guide...",
          "steps": [
            "1. Initialize project and setup CI/CD pipeline...",
            "2. Configure Database connection in src/config...",
            "3. Implement Auth service with JWT..."
          ]
        }
      `;
      
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(completion.choices[0]?.message?.content || "{}");
    },

    // 3. QUIZ ENGINE
    generateQuiz: async (_: any, { topic, jobRole }: { topic: string, jobRole: string }) => {
      const prompt = `
        Generate a Hard Technical Quiz (5 Questions) on: "${topic}" for a "${jobRole}" role.
        Output JSON: { "questions": [{ "question": "...", "options": [], "correctAnswer": 0, "explanation": "..." }] }
      `;
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });
      const res = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return res.questions || [];
    }
  },
};

const server = new ApolloServer({ resolvers, typeDefs });
const handler = startServerAndCreateNextHandler(server);
export { handler as GET, handler as POST };