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

  # 🔥 NEW: Rich Project Structure
  type ProjectStep {
    id: String
    title: String
    description: String
    type: String # "command" or "code" or "file_structure"
    content: String # The actual code or command
    filePath: String # e.g. "backend/models/User.js" (optional for commands)
  }

  type ProjectScaffold {
    projectName: String
    techStack: String
    summary: String
    fileTree: String # Visual tree representation
    steps: [ProjectStep]
  }

  type Analysis {
    score: Int
    status: String
    summary: String
    topMissingSkills: [String]
    recommendedStack: String
    roadmap: [WeekPlan]
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
    // 1. ANALYSIS ENGINE
    analyzeApplication: async (_: any, { resumeText, jobDescription, jobRole }: any) => {
      const prompt = `
        You are a Principal Software Architect and Career Mentor.
        
        CONTEXT:
        - TARGET ROLE: ${jobRole}
        - JD: "${jobDescription.slice(0, 3000)}"
        - RESUME: "${resumeText.slice(0, 15000)}"

        YOUR MISSION:
        1. **GAP ANALYSIS**: Strictly compare Resume vs JD. If a skill is required but missing/weak in resume, list it.
        2. **TECH STACK**: Recommend the exact stack needed for the role (e.g. if JD wants Go/Microservices, suggest Go, gRPC, Docker).
        
        3. **DYNAMIC MASTERY ROADMAP**: 
           - Create a week-by-week plan strictly focused on the MISSING SKILLS.
           - If many gaps, make it 6-8 weeks. If few gaps, 3-4 weeks.
           - Be specific: "Week 1: Go Syntax & Routines", not just "Learn Go".
           - **RESOURCES**: Searchable titles like "Go by Example", "Official React Docs".

        4. **ATS IMPROVEMENT**: Rewrite 2 weak resume bullet points to use strong action verbs and metrics.

        5. **PROJECT IDEA**: Suggest a "Flagship" project with respect to skills defined in Job Description and with respect to role. It must be complex enough to get hired (e.g. "Real-time Order System", not "ToDo list").

        OUTPUT JSON ONLY:
        {
          "score": <0-100>,
          "status": "<'Strong'|'Good'|'Weak'>",
          "summary": "<Direct feedback summary>",
          "topMissingSkills": ["<Skill 1>", "<Skill 2>"],
          "recommendedStack": "<Tech Stack>",
          "projectIdea": "<Project Name and High-Level Description>",
          "roadmap": [
             { 
               "week": "Week 1", 
               "goal": "<Theme>", 
               "tasks": ["<Task 1>", "<Task 2>"], 
               "resources": [{ "title": "<Resource>", "url": "...", "type": "Video/Article" }] 
             }
          ],
          "atsFixes": [
             { "original": "...", "improved": "...", "reason": "..." }
          ],
          "interviewPrep": "<A hard scenario-based question>"
        }
      `;

      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "You are a JSON-only Career Agent." },
            { role: "user", content: prompt },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
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

    // 2. PROJECT SCAFFOLDER (The "ChatGPT-like" Builder)
    generateScaffold: async (_: any, { techStack, projectIdea }: any) => {
    const prompt = `
You are a Senior Software Architect and Dev Lead with real-world production experience.

GOAL:
Generate a COMPLETE, production-ready, Zero-to-Hero build guide for the project below.
The output must be detailed enough that a developer can build and run the project from an empty folder without guessing.

PROJECT DETAILS:
- Project Name: "${projectIdea}"
- Tech Stack: "${techStack}"

STRICT REQUIREMENTS (DO NOT SKIP ANY):

1. Start by VISUALIZING the COMPLETE project folder structure (ASCII tree).
   - This structure becomes the SINGLE SOURCE OF TRUTH.
   - Do NOT use "..." anywhere in the tree.
2. Follow the structure EXACTLY in all later steps.
   - Every file referenced MUST exist in the tree.
   - No extra, missing, or implied files or folders.
3. Cover the FULL STACK end-to-end:
   - Project initialization
   - Backend setup (MANDATORY if RESTful APIs are mentioned)
   - Database configuration (if applicable)
   - Models
   - Middleware
   - Routes / APIs
   - Authentication (ONLY if applicable)
   - Frontend / Mobile setup
   - UI pages & components
   - API integration
   - Environment configuration
4. For EVERY file in the structure:
   - Provide the COMPLETE file content
   - NO placeholders like "...", "TODO", or "etc."
   - Use clean, readable, production-quality code
   - All imports MUST resolve correctly
   - If a dependency is used, it MUST be installed explicitly
5. For EVERY setup step:
   - Provide the EXACT terminal commands
   - Commands MUST be copy-paste runnable
   - Commands MUST exist in the real world (NO invented CLIs)
   - Commands MUST be in correct execution order
6. Keep logic SIMPLE and EASY to UNDERSTAND
   - Prefer clarity over cleverness
   - Avoid unnecessary abstractions
7. Assume the reader is a MID-LEVEL DEVELOPER
   - Explain briefly where needed
   - No beginner fluff
   - No senior-only jargon
8. Do NOT:
   - Skip files
   - Combine multiple files into one step
   - Use pseudo-code
   - Refer to external tutorials or links
   - Use placeholder URLs like api.example.com
9. The output MUST be VALID JSON
   - NO markdown
   - NO comments outside JSON
   - Escape newlines properly (\\n)
   - JSON must be machine-parseable

PLATFORM-SPECIFIC RULES (MANDATORY):

- If iOS is used:
  - Xcode project creation MUST be done via Xcode (not fake CLI commands)
  - Podfile usage must include valid CocoaPods commands only
  - Firebase MUST be configured using GoogleService-Info.plist
  - Push notifications must include:
    - APNs registration
    - Permission handling
    - AppDelegate integration
  - Info.plist must contain ONLY valid iOS keys

- If REST APIs are mentioned:
  - A REAL backend project MUST be created
  - Backend routes MUST be implemented and used by the client
  - Request/response models MUST match client-side decoding

OUTPUT FORMAT (JSON ONLY):

{
  "projectName": "<string>",
  "techStack": "<string>",
  "summary": "<brief 2–3 line overview of what we are building>",
  "fileTree": "<complete ASCII folder structure>",
  "steps": [
    {
      "id": "1",
      "title": "Project Initialization",
      "description": "Explain what this step does in 1–2 lines.",
      "type": "command",
      "content": "<exact terminal commands>"
    },
    {
      "id": "2",
      "title": "Backend Entry Point",
      "description": "Explain the purpose of this file.",
      "type": "code",
      "filePath": "backend/server.js",
      "content": "<complete code>"
    },
    {
      "id": "3",
      "title": "How to run the project",
      "description": "Final step to run the entire project locally.",
      "type": "command",
      "content": "<exact terminal commands>"
    }
      
    // Continue until the project is fully built and runnable
  ]
}

QUALITY CHECK (DO THIS INTERNALLY BEFORE OUTPUT):
- Can this project run if someone follows steps in order?
- Are all imports and dependencies resolvable?
- Are backend APIs real and reachable?
- Are environment variables clearly defined and used?
- Is the file tree 100% aligned with the code?
- Is Firebase / platform configuration valid?
- Is the JSON valid and parseable?

If ANY issue is found:
- Fix it silently
- Re-check everything
- Then output the final result

ONLY RETURN THE JSON OBJECT. NOTHING ELSE.
After all steps, include a final step explaining:
- Architecture
- Data flow
- Push notification flow
- Scaling strategy
- Trade-offs
`;


      
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(completion.choices[0]?.message?.content || "{}");
    },

    // 3. QUIZ ENGINE (Unchanged)
    generateQuiz: async (_: any, { topic, jobRole }: any) => {
      const prompt = `Generate 5 Hard Technical Questions on "${topic}" for "${jobRole}". Output JSON: { "questions": [{ "question": "...", "options": [], "correctAnswer": 0, "explanation": "..." }] }`;
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