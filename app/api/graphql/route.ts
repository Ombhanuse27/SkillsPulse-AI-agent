import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { ApolloServer } from "@apollo/server";
import { gql } from "graphql-tag";
import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const typeDefs = gql`
  type Resource { title: String, url: String, type: String }
  type WeekPlan { week: String, goal: String, tasks: [String], resources: [Resource] }
  type AtsFix { original: String, improved: String, reason: String }
  type QuizQuestion { question: String, options: [String], correctAnswer: Int, explanation: String }
  type ProjectIdea { title: String, description: String, difficulty: String, techStack: [String], keyFeatures: [String] }

  type Analysis {
    score: Int, status: String, summary: String, topMissingSkills: [String], recommendedStack: String,
    roadmap: [WeekPlan], atsFixes: [AtsFix], projectIdea: String, interviewPrep: String,coverLetter: String
  }
  type Query { hello: String }
  type Mutation {
    analyzeApplication(resumeText: String, resumeId: String, jobDescription: String!, jobRole: String!): Analysis
    generateQuiz(topic: String!, jobRole: String!): [QuizQuestion]
    generateProjectIdeas(missingSkills: [String]!, jobRole: String!, jobDescription: String!): [ProjectIdea]
  }
`;

const resolvers = {
  Mutation: {
    analyzeApplication: async (_: any, { resumeText, resumeId, jobDescription, jobRole }: any) => {
      // 1. Context Hydration
      if (resumeId) {
        try {
          const r = await prisma.resume.findUnique({
            where: { id: resumeId },
            include: { skills: true, experiences: true, projects: true }
          });
          if (r) {
            resumeText = `
              CANDIDATE PROFILE:
              - Name: ${r.fullName}
              - Summary: ${r.summary}
              
              EXPLICIT SKILLS: ${r.skills.map(s => s.name).join(", ")}
              
              EXPERIENCE TIMELINE:
              ${r.experiences.map(e => `[${e.duration || "Unknown Date"}] ${e.role} @ ${e.company}: ${e.description}`).join("\n")}
              
              PROJECTS: ${r.projects.map(p => `${p.title}: ${p.description}`).join("\n")}
            `;
          }
        } catch (e) { console.error("DB Error", e); }
      }
      if (!resumeText) resumeText = "No Resume Data";

      // 2. Strict Prompt (UPDATED FOR ROADMAP & ATS COVERAGE)
      const prompt = `
        Act as a Strict Technical Auditor & Career Coach. Analyze this Candidate vs JD.
        
        JOB ROLE: ${jobRole}
        JD: "${jobDescription.slice(0, 3000)}"
        CANDIDATE DATA: ${resumeText}

        **SCORING ALGORITHM:**
        1. **Experience Gap**: If (Candidate Years) < (JD Required Years * 0.5), MAX SCORE = 50.
        2. **Evidence**: Only list skills as "Strength" if explicitly in Candidate Data.

        **GENERATION INSTRUCTIONS:**

        **A. GAP ANALYSIS:**
        - Identify the "Top Missing Skills" strictly based on the JD.

        **B. ROADMAP (Targeting Missing Skills):**
        - Create a week-by-week plan specifically to LEARN the "Top Missing Skills" identified above.
        - If the candidate is missing "System Design", Week 1 should be "System Design Fundamentals".
        - Do not generate generic weeks.

        **C. ATS IMPROVEMENTS (Section-by-Section):**
        - Review the **SUMMARY**: Is it punchy? If not, provide a rewrite.
        - Review **EXPERIENCE**: Are bullet points result-oriented? Rewrite 1-2 weak points.
        - Review **PROJECTS**: Do they mention tech stacks? Rewrite if vague.
        - **Output exactly 3-4 fixes covering different sections.**

        **D. COVER LETTER (New Requirement):**
        - Write a professional, personalized cover letter.
        - Connect the Candidate's specific projects/experience to the JD's requirements.
        - Tone: Professional, confident, and enthusiastic.
        - Format: Standard letter format (Dear Hiring Manager...).

        OUTPUT JSON ONLY:
        {
          "score": <0-100>,
          "status": "<Strong|Good|Weak>",
          "summary": "<2 sentence summary>",
          "topMissingSkills": ["<Skill1>", "<Skill2>"],
          "recommendedStack": "<Comma separated list of ALL key tech in JD>",
          "coverLetter": "<Full text of the cover letter with \\n for line breaks>",
          "roadmap": [
             { "week": "Week 1", "goal": "Mastering <Missing Skill 1>", "tasks": ["Task 1", "Task 2"], "resources": [] },
             { "week": "Week 2", "goal": "Applied Practice for <Missing Skill 2>", "tasks": ["Task 1", "Task 2"], "resources": [] }
          ],
          "atsFixes": [
             { "original": "<Original Text from Summary/Exp>", "improved": "<ATS Optimized Version>", "reason": "Optimized Summary for Impact" },
             { "original": "<Weak Bullet Point>", "improved": "<Strong Action-Verb Bullet>", "reason": "Added Metrics and Results" },
             { "original": "<Vague Project Desc>", "improved": "<Tech-Heavy Description>", "reason": "Highlighted Tech Stack" }
          ], 
          "interviewPrep": "<Hard Question>"
        }
      `;

      try {
        const completion = await groq.chat.completions.create({
          messages: [
             { role: "system", content: "You are a Fact-Checking Engine. Follow the scoring algorithm strictly." },
             { role: "user", content: prompt }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0,
          response_format: { type: "json_object" },
        });
        const res = JSON.parse(completion.choices[0]?.message?.content || "{}");
        
        await prisma.analysisResult.create({
          data: { role: jobRole, jobDescription, resumeText, score: res.score || 0, status: res.status || "Pending", feedback: res }
        });
        return res;
      } catch (error) { 
        console.error("AI Error:", error);
        throw new Error("Analysis failed"); 
      }
    },

    generateQuiz: async (_: any, { topic, jobRole }: any) => {
       const prompt = `Generate 5 Hard Technical Interview Questions on "${topic}" for "${jobRole}". JSON: { "questions": [{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..." }] }`;
       const c = await groq.chat.completions.create({ messages: [{role: "user", content: prompt}], model: "llama-3.3-70b-versatile", response_format: { type: "json_object" }});
       return JSON.parse(c.choices[0]?.message?.content || "{}").questions || [];
    },

    // ... inside Mutation
    generateProjectIdeas: async (_: any, { missingSkills, jobRole, jobDescription }: any) => {
      
      const prompt = `
        Act as a Senior Technical Lead.
        Generate 3 "Senior-Level" Capstone Project Ideas.

        **CONTEXT:**
        - TARGET ROLE: ${jobRole}
        - JD TECH STACK: "${jobDescription.slice(0, 3000)}"
        - CANDIDATE GAPS: ${missingSkills.join(", ")}

        **CRITICAL RULES (DO NOT BREAK):**
        1. **TECH STACK ENFORCEMENT**: 
           - You MUST use the technologies listed in the JD (e.g., If JD says "MySQL", do NOT use MongoDB).
           - If the JD asks for "TypeScript", ALL projects must use TypeScript, not just JavaScript.
           - If the JD is for "Node.js", do NOT suggest Python, Java, or Django projects.
        
        2. **GAP INTEGRATION**:
           - Try to incorporate the "Missing Skills" ONLY IF they fit the JD's stack.
           - Example: If missing skill is "System Design", include a requirement for an Architecture Diagram.
           - Example: If missing skill is "Python" but JD requires "Node.js", IGNORE the Python skill.

        3. **COMPLEXITY**:
           - Projects must involve "System Architecture", "Scalability", or "Performance" to satisfy the Senior requirements.

        OUTPUT JSON ONLY:
        { 
          "ideas": [
            { 
              "title": "<Project Name>", 
              "description": "<Description focusing on Architecture & Scale>", 
              "difficulty": "Advanced", 
              "techStack": ["<Tech 1 from JD>", "<Tech 2 from JD>"], 
              "keyFeatures": ["<Feature 1>", "<Feature 2>"] 
            }
          ] 
        }
      `;

      try {
        const c = await groq.chat.completions.create({ 
          messages: [{role: "user", content: prompt}], 
          model: "llama-3.3-70b-versatile", 
          response_format: { type: "json_object" }
        });
        return JSON.parse(c.choices[0]?.message?.content || "{}").ideas || [];
      } catch (e) {
        console.error("Project Gen Error", e);
        throw new Error("Failed to generate ideas");
      }
    }
  },
};  

const server = new ApolloServer({ resolvers, typeDefs });
const handler = startServerAndCreateNextHandler(server);
export { handler as GET, handler as POST };