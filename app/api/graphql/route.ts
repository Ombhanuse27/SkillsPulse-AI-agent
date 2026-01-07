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

  type ProjectIdea {
    title: String
    description: String
    difficulty: String 
    techStack: [String]
    keyFeatures: [String]
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
    generateProjectIdeas(missingSkills: [String]!, jobRole: String!): [ProjectIdea]
  }
`;

const resolvers = {
  Mutation: {
    // 1. ANALYSIS ENGINE (Fixed Prompt)
    analyzeApplication: async (_: any, { resumeText, jobDescription, jobRole }: any) => {
      const prompt = `
        You are a Principal Software Architect and Technical Recruiter.
        
        CONTEXT:
        - TARGET ROLE: ${jobRole}
        - JD: "${jobDescription.slice(0, 3000)}"
        - RESUME: "${resumeText.slice(0, 15000)}"

        **CRITICAL INSTRUCTION - READ CAREFULLY:**
        1. **SCAN RESUME FIRST**: specific keywords like "Next.js", "Docker", "React", "TypeScript", "Node.js". 
        2. **STRICT GAP ANALYSIS**: 
           - **IF A SKILL IS IN THE RESUME (even in Projects/Skills section), IT IS NOT MISSING.** - ONLY list skills in "topMissingSkills" if they are **COMPLETELY ABSENT** from the resume text.
           - Example: If JD asks for "Docker" and Resume says "HealthSchedule - Docker", DO NOT list Docker as missing.
           - Example: If JD asks for "Django" and Resume has NO mention of "Django", LIST Django.

        YOUR MISSION:
        1. **SCORE**: Rate match 0-100 based on skills present vs required.
        2. **GAP LIST**: Strict list of completely missing skills.
        3. **TECH STACK**: Recommend the stack defined in the JD.
        4. **MASTERY ROADMAP**: 
           - Create a week-by-week plan strictly focused on the MISSING SKILLS.
           - If few gaps, 3-4 weeks. If many, 6-8 weeks.
        5. **ATS IMPROVEMENT**: Rewrite 2 bullet points to sound more "Senior" (Action Verb + Metric + Result).
        6. **PROJECT**: Suggest a specific Capstone project to bridge the gap between "Intern" and "Senior".

        OUTPUT JSON ONLY:
        {
          "score": <Int>,
          "status": "<'Strong'|'Good'|'Weak'>",
          "summary": "<2 sentence summary of fit>",
          "topMissingSkills": ["<Skill 1>", "<Skill 2>"],
          "recommendedStack": "<Comma separated list>",
          "projectIdea": "<Project Title>",
          "roadmap": [
             { 
               "week": "Week 1", 
               "goal": "<Theme>", 
               "tasks": ["<Task 1>", "<Task 2>"], 
               "resources": [{ "title": "<Resource Name>", "url": "https://google.com/search?q=...", "type": "Article" }] 
             }
          ],
          "atsFixes": [
             { "original": "...", "improved": "...", "reason": "..." }
          ],
          "interviewPrep": "<Hard Question>"
        }
      `;

      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "You are a specific JSON-only Analysis Engine. Do not hallucinate missing skills if they exist in text." },
            { role: "user", content: prompt },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1, // Low temp to reduce hallucinations
          response_format: { type: "json_object" },
        });

        const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");

        // Optional: Save to DB
        // await prisma.analysisResult.create({ ... });

        return aiResponse;
      } catch (error) {
        console.error("AI Error:", error);
        throw new Error("AI Agent Failed");
      }
    },

    // 2. PROJECT IDEA GENERATOR
    generateProjectIdeas: async (_: any, { missingSkills, jobRole }: any) => {
      const skillsStr = missingSkills.length > 0 ? missingSkills.join(", ") : "advanced architecture patterns";
      
      const prompt = `
        Role: Tech Lead Mentor.
        Target: "${jobRole}".
        Gaps: ${skillsStr}.

        Generate 3 Project Ideas to fill these gaps.
        OUTPUT JSON ONLY:
        {
          "ideas": [
            {
              "title": "<Name>",
              "description": "<Desc>",
              "difficulty": "Beginner",
              "techStack": ["<Tech>"],
              "keyFeatures": ["<Feature>"]
            },
            {
              "title": "<Name>",
              "description": "<Desc>",
              "difficulty": "Intermediate",
              "techStack": ["<Tech>"],
              "keyFeatures": ["<Feature>"]
            },
            {
              "title": "<Name>",
              "description": "<Desc>",
              "difficulty": "Advanced",
              "techStack": ["<Tech>"],
              "keyFeatures": ["<Feature>"]
            }
          ]
        }
      `;
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" }
        });
        
        const res = JSON.parse(completion.choices[0]?.message?.content || "{}");
        return res.ideas || [];
      } catch (e) {
        console.error("Project Gen Error", e);
        throw new Error("Failed to generate ideas");
      }
    },

    // 3. QUIZ ENGINE
    generateQuiz: async (_: any, { topic, jobRole }: any) => {
      const prompt = `Generate 5 Hard Technical Interview Questions on "${topic}" for "${jobRole}". 
      OUTPUT JSON: { "questions": [{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..." }] }`;
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" }
        });
        const res = JSON.parse(completion.choices[0]?.message?.content || "{}");
        return res.questions || [];
      } catch (e) {
        return [];
      }
    }
  },
};

const server = new ApolloServer({ resolvers, typeDefs });
const handler = startServerAndCreateNextHandler(server);
export { handler as GET, handler as POST };