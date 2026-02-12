import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { StateGraph, START, END } from "@langchain/langgraph";
import { tavily } from "@tavily/core"; // <--- CORRECT IMPORT
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. CONFIGURATION ---
const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,
  apiKey: process.env.GROQ_API_KEY
});

// Initialize Tavily Client
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// --- 2. STATE DEFINITION ---
interface AgentState {
  userId: string;
  goal: string;
  milestones: any[];
  schedule: any[];
}

// --- 3. AGENT NODES ---

// A. PLANNER
const plannerNode = async (state: AgentState) => {
  const prompt = `You are a Senior Career Architect. 
  User Goal: ${state.goal}.
  
  Create a 4-step execution roadmap.
  Return ONLY a valid JSON array of objects. 
  Each object MUST have: "title" (string), "description" (string), "duration_weeks" (int).
  NO markdown. NO explanations.`;
  
  const result = await llm.invoke([new SystemMessage(prompt)]);
  // Clean JSON logic to handle potential markdown wrappers
  const cleanJson = result.content.toString().replace(/```json|```/g, "").trim();
  return { milestones: JSON.parse(cleanJson) };
};

// B. RESEARCHER (Using @tavily/core)
const researcherNode = async (state: AgentState) => {
  const milestones = state.milestones;
  const enriched = [];

  for (const m of milestones) {
    const query = `best tutorial or github repo for learning ${m.title} ${state.goal}`;
    let resources = [];
    
    try {
      // Direct API Call
      const response = await tvly.search(query, {
        search_depth: "basic",
        max_results: 2
      });
      
      resources = response.results.map((r: any) => ({
        title: r.title.slice(0, 50) + "...",
        url: r.url,
        type: r.url.includes('youtube') ? 'YOUTUBE' : 'DOCS'
      }));
    } catch (e) {
      console.error("Search failed:", e);
      resources = [{ title: `Official ${m.title} Docs`, url: "https://google.com", type: "DOCS" }];
    }
    
    enriched.push({ ...m, resources });
  }
  return { milestones: enriched };
};

// C. SCHEDULER & DB SAVER
// C. SCHEDULER & DB SAVER
const schedulerNode = async (state: AgentState) => {
  let currentWeek = 1;
  
  // --- FIX START: Ensure User Exists ---
  // We try to find the user. If they don't exist (because they just signed up via Supabase),
  // we create them in our local DB to satisfy the Foreign Key constraint.
  const userExists = await prisma.user.findUnique({
    where: { id: state.userId }
  });

  if (!userExists) {
    // Ideally, you'd fetch the real email from Supabase Admin here, 
    // but for now we create a placeholder so the FK works.
    await prisma.user.create({
      data: {
        id: state.userId,
        email: `temp_${state.userId}@placeholder.com`, // Placeholder email
        fullName: "New User"
      }
    });
  }
  // --- FIX END ---

  const roadmap = await prisma.roadmap.create({
    data: {
      userId: state.userId,
      title: state.goal,
      milestones: {
        create: state.milestones.map((m: any) => {
          const week = currentWeek;
          currentWeek += m.duration_weeks;
          return {
            title: m.title,
            description: m.description,
            week: week,
            resources: {
              create: m.resources.map((r: any) => ({
                title: r.title,
                url: r.url,
                type: r.type
              }))
            }
          };
        })
      }
    }
  });

  return { schedule: state.milestones };
};

// --- 4. GRAPH BUILD ---
const workflow = new StateGraph<AgentState>({
  channels: {
    userId: { reducer: (x, y) => y ?? x },
    goal: { reducer: (x, y) => y ?? x },
    milestones: { reducer: (x, y) => y ?? x },
    schedule: { reducer: (x, y) => y ?? x },
  }
})
  .addNode("planner", plannerNode)
  .addNode("researcher", researcherNode)
  .addNode("scheduler", schedulerNode)
  .addEdge(START, "planner")
  .addEdge("planner", "researcher")
  .addEdge("researcher", "scheduler")
  .addEdge("scheduler", END);

const app = workflow.compile();

// --- 5. API HANDLER ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, userId } = body;
    
    await app.invoke({ userId, goal, milestones: [], schedule: [] });
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}