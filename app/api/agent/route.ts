import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { tavily } from "@tavily/core";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,
  apiKey: process.env.GROQ_API_KEY
});

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// ==========================================
// 1. UPDATED STATE DEFINITION
// ==========================================
const RoadmapState = Annotation.Root({
  userId: Annotation<string>(),
  goal: Annotation<string>(),
  timebox: Annotation<{
    value: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
    isIntensive: boolean;
  } | null>({
    reducer: (x, y) => y ?? x,
    default: () => null
  }),
  milestones: Annotation<any[]>({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
  enrichedMilestones: Annotation<any[]>({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
  quizzes: Annotation<any[]>({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
});

// ==========================================
// TIME EXTRACTION (Unchanged)
// ==========================================
function extractTimeConstraints(goal: string) {
  const match = goal.match(/(\d+)\s*-?\s*(hour|day|week|month)s?/i);
  
  if (!match) return null;

  const value = parseInt(match[1]);
  let rawUnit = match[2].toLowerCase();

  if (!rawUnit.endsWith('s')) rawUnit += 's'; 
  const unit = rawUnit as 'hours' | 'days' | 'weeks' | 'months';
  
  const isIntensive = (unit === 'days' && value <= 14) || (unit === 'hours');

  console.log(`⏱️ Timebox detected: ${value} ${unit} (Intensive: ${isIntensive})`);

  return { value, unit, isIntensive };
}

// ==========================================
// 2. UPDATED AGENT: ADAPTIVE PLANNER
// ==========================================
const plannerNode = async (state: typeof RoadmapState.State) => {
  const timebox = extractTimeConstraints(state.goal);
  const cleanGoal = state.goal.replace(/in \d+\s*-?\s*(hour|day|week|month)s?/i, '').trim();

  let systemPrompt = "";

  if (timebox?.isIntensive) {
    // --- MODE: CRASH COURSE / INTENSIVE ---
    console.log(`🔥 ACTIVATING INTENSIVE MODE for ${cleanGoal}`);
    systemPrompt = `You are an Expert Bootcamp Instructor creating a HIGH-INTENSITY CRASH COURSE.
    
    TOPIC: ${cleanGoal}
    STRICT DEADLINE: ${timebox.value} ${timebox.unit.toUpperCase()}
    
    GOAL: Functionality over theory.
    
    CRITICAL RULES FOR TITLES:
    1. Titles MUST be specific technical topics (e.g., "Day 1: React State & Props").
    2. DO NOT use generic names like "Introduction" or "Basics" alone.
    3. BAD: "Day 1: Introduction"
    4. GOOD: "Day 1: Build a To-Do App with State"
    
    Return ONLY valid JSON (NO markdown):
    [
      {
        "title": "Day 1: [Specific Technical Topic]",
        "description": "Actionable outcome (e.g., Build X).",
        "duration_value": 1,
        "difficulty": "beginner"
      }
    ]`;
  } else {
    // --- MODE: STANDARD ACADEMIC ---
    // UPDATED: Now forbids generic titles to fix search relevance
    console.log(`📚 ACTIVATING ACADEMIC MODE for ${cleanGoal}`);
    systemPrompt = `You are a Senior Technical Curriculum Developer.

    USER GOAL: ${cleanGoal}

    Create a structured learning path.
    
    CRITICAL RULES FOR TITLES:
    1. Titles MUST be specific technical topics.
    2. DO NOT use generic labels like "Foundations", "Intermediate Skills", or "Advanced Topics".
    3. The Search Agent relies on these titles. "Foundations" gives bad results. "Next.js Routing" gives good results.

    BAD EXAMPLES:
    - "Module 1: Foundations" (Too vague)
    - "Module 2: Intermediate Skills" (Too vague)

    GOOD EXAMPLES:
    - "Module 1: Next.js Routing & App Router"
    - "Module 2: Server-Side Rendering (SSR) & SSG"
    - "Module 3: Authentication with NextAuth.js"

    Return ONLY valid JSON (NO markdown):
    [
      {
        "title": "Module 1: [Specific Technical Topic]",
        "description": "Detailed technical concepts covered.",
        "duration_value": 1, 
        "difficulty": "beginner"
      }
    ]`;
  }
  
  try {
    const result = await llm.invoke([new SystemMessage(systemPrompt)]);
    const cleanJson = result.content.toString().replace(/```json|```/g, "").trim();
    const milestones = JSON.parse(cleanJson);
    
    if (!Array.isArray(milestones) || milestones.length === 0) {
      throw new Error("Invalid structure");
    }

    const formattedMilestones = milestones.map(m => ({
      ...m,
      duration_unit: timebox?.isIntensive ? timebox.unit : 'weeks',
      estimatedHours: timebox?.isIntensive ? 4 : 15 
    }));

    return { 
      milestones: formattedMilestones,
      timebox,
      goal: cleanGoal 
    };

  } catch (error) {
    console.error("Planner error:", error);
    return {
      milestones: [
        {
          title: "Day 1: Setup & Core Concepts",
          description: "Environment setup and Hello World.",
          duration_unit: "days",
          estimatedHours: 4,
          difficulty: "beginner"
        },
        {
          title: "Day 2: Core Features Implementation",
          description: "Building specific features.",
          duration_unit: "days",
          estimatedHours: 4,
          difficulty: "intermediate"
        },
        {
          title: "Day 3: Deployment & Review",
          description: "Ship it.",
          duration_unit: "days",
          estimatedHours: 4,
          difficulty: "intermediate"
        }
      ],
      timebox,
      goal: cleanGoal
    };
  }
};

// ==========================================
// 3. UPDATED AGENT: SMART RESEARCHER
// ==========================================
const researcherNode = async (state: typeof RoadmapState.State) => {
  const enriched = [];
  const globalSeenUrls = new Set<string>();
  
  const isCrashCourse = state.timebox?.isIntensive;

  for (const milestone of state.milestones) {
    let searches = [];

    // NEW: Clean title for search (remove "Module 1:" or "Day 1:" prefixes)
    // This turns "Module 1: Next.js Routing" into "Next.js Routing" for better search results
    const topic = milestone.title.replace(/^(Module|Day|Week|Hour) \d+:?\s*/i, "");

    if (isCrashCourse) {
        searches = [
            `${topic} ${state.goal} crash course`,
            `${topic} cheat sheet`,
            `fastest way to learn ${topic}`
        ];
    } else {
        searches = [
            `${topic} ${state.goal} tutorial`,
            `${topic} guide best practices`,
            `${topic} documentation`
        ];
    }

    let allResources: any[] = [];
    const limit = isCrashCourse ? 1 : 2; 

    for (let i = 0; i < limit; i++) {
      const query = searches[i];
      if(!query) continue;

      try {
        const response = await tvly.search(query, {
          search_depth: "basic", 
          max_results: 2
        });

        const resources = response.results.map((r: any) => ({
          title: r.title.length > 60 ? r.title.slice(0, 60) + "..." : r.title,
          url: r.url,
          type: classifyType(r.url),
          score: r.score || 0.5
        }));

        allResources.push(...resources);
        
      } catch (error) {
        console.error(`Search failed for "${query}":`, error);
      }
    }

    const uniqueResources = deduplicateResources(allResources, globalSeenUrls);
    const diverseResources = diversifyByType(uniqueResources).slice(0, 4);
    diverseResources.forEach(r => globalSeenUrls.add(r.url));

    if (diverseResources.length === 0) {
      diverseResources.push({
        title: `${topic} Resources`,
        url: `https://www.google.com/search?q=${encodeURIComponent(topic + ' ' + state.goal)}`,
        type: 'DOCS',
        score: 0
      });
    }

    enriched.push({
      ...milestone,
      resources: diverseResources
    });
  }

  return { enrichedMilestones: enriched };
};

// ... (Helper functions remain the same)
function classifyType(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YOUTUBE';
  if (lowerUrl.includes('github.com')) return 'GITHUB';
  if (lowerUrl.includes('freecodecamp') || lowerUrl.includes('codecademy') || 
      lowerUrl.includes('udemy') || lowerUrl.includes('coursera')) return 'INTERACTIVE';
  if (lowerUrl.includes('medium.com') || lowerUrl.includes('dev.to') || 
      lowerUrl.includes('blog')) return 'ARTICLE';
  return 'DOCS';
}

function deduplicateResources(resources: any[], globalSeen: Set<string>): any[] {
  const seen = new Set<string>(globalSeen);
  const unique: any[] = [];
  for (const resource of resources) {
    if (!seen.has(resource.url)) {
      seen.add(resource.url);
      unique.push(resource);
    }
  }
  return unique;
}

function diversifyByType(resources: any[]): any[] {
  const typesSeen = new Set<string>();
  const diverse: any[] = [];
  const remaining: any[] = [];

  for (const res of resources) {
    if (!typesSeen.has(res.type) && diverse.length < 4) {
      diverse.push(res);
      typesSeen.add(res.type);
    } else {
      remaining.push(res);
    }
  }

  const sorted = remaining.sort((a, b) => b.score - a.score);
  while (diverse.length < 4 && sorted.length > 0) {
    diverse.push(sorted.shift());
  }
  return diverse;
}

// ==========================================
// 4. QUIZ GENERATOR (Unchanged)
// ==========================================
const quizGeneratorNode = async (state: typeof RoadmapState.State) => {
  const allQuizzes: any[] = [];

  for (const milestone of state.enrichedMilestones) {
    const prompt = `Create 2 multiple choice questions for: ${milestone.title}
    Focus on: ${milestone.description}
    Return JSON Array: [{ "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "...", "difficulty": "easy" }]`;

    try {
      const result = await llm.invoke([new SystemMessage(prompt)]);
      const cleanJson = result.content.toString().replace(/```json|```/g, "").trim();
      
      const jsonMatch = cleanJson.match(/\[.*\]/s);
      const jsonString = jsonMatch ? jsonMatch[0] : cleanJson;
      
      const quizzes = JSON.parse(jsonString);
      
      if (Array.isArray(quizzes)) {
        allQuizzes.push(...quizzes.map(q => ({
          ...q,
          milestoneTitle: milestone.title
        })));
      } 
    } catch (error) {
       console.log(`Quiz gen failed for ${milestone.title}, using fallback.`);
       allQuizzes.push({
         milestoneTitle: milestone.title,
         question: `What is the primary goal of ${milestone.title}?`,
         options: ["To confuse you", "To learn the core concept", "To waste time", "None of above"],
         correctIndex: 1,
         explanation: "Understanding the core concept is the key.",
         difficulty: "easy"
       });
    }
  }

  return { quizzes: allQuizzes };
};

// ==========================================
// 5. SCHEDULER (Unchanged)
// ==========================================
const schedulerNode = async (state: typeof RoadmapState.State) => {
  let currentSequence = 1;
  
  const userExists = await prisma.user.findUnique({
    where: { id: state.userId }
  });

  if (!userExists) {
    await prisma.user.create({
      data: {
        id: state.userId,
        email: `user_${state.userId}@skillpulse.app`,
        fullName: "SkillPulse Learner"
      }
    });
  }

  const statsExists = await prisma.learningStats.findUnique({
    where: { userId: state.userId }
  });
  if (!statsExists) {
    await prisma.learningStats.create({ data: { userId: state.userId } });
  }

  try {
    const roadmap = await prisma.roadmap.create({
      data: {
        userId: state.userId,
        title: state.goal, 
        totalWeeks: state.timebox?.isIntensive ? 1 : state.enrichedMilestones.length,
        difficulty: determineDifficulty(state.enrichedMilestones),
        milestones: {
          create: state.enrichedMilestones.map((m: any, index: number) => {
            const sequence = currentSequence++;
            
            return {
              title: m.title,
              description: m.description,
              week: sequence, 
              order: index,
              estimatedHours: m.estimatedHours || 4,
              difficulty: m.difficulty || 'intermediate',
              resources: {
                create: m.resources.map((r: any) => ({
                  title: r.title,
                  url: r.url,
                  type: r.type
                }))
              },
              quizzes: {
                create: state.quizzes
                  .filter((q: any) => q.milestoneTitle === m.title)
                  .map((q: any) => ({
                    question: q.question,
                    options: q.options,
                    correctIndex: q.correctIndex,
                    explanation: q.explanation,
                    difficulty: q.difficulty
                  }))
              }
            };
          })
        }
      },
      include: {
        milestones: {
          include: { resources: true, quizzes: true }
        }
      }
    });

    const milestoneIds = roadmap.milestones.map(m => m.id);
    await prisma.milestoneProgress.createMany({
      data: milestoneIds.map(milestoneId => ({
        userId: state.userId,
        milestoneId,
        status: 'not_started'
      }))
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.dailyGoal.upsert({
      where: { userId_date: { userId: state.userId, date: today } },
      update: {},
      create: {
        userId: state.userId,
        date: today,
        targetMins: state.timebox?.isIntensive ? 60 : 30,
        targetQuizzes: 3
      }
    });

  } catch (dbError) {
    console.error("❌ Database error:", dbError);
    throw new Error("Failed to save roadmap");
  }

  return { enrichedMilestones: state.enrichedMilestones };
};

function determineDifficulty(milestones: any[]): string {
  const difficulties = milestones.map(m => m.difficulty);
  if (difficulties.includes('advanced')) return 'advanced';
  if (difficulties.includes('intermediate')) return 'intermediate';
  return 'beginner';
}

// ==========================================
// WORKFLOW SETUP
// ==========================================
const workflow = new StateGraph(RoadmapState)
  .addNode("planner", plannerNode)
  .addNode("researcher", researcherNode)
  .addNode("quiz_generator", quizGeneratorNode)
  .addNode("scheduler", schedulerNode)
  .addEdge(START, "planner")
  .addEdge("planner", "researcher")
  .addEdge("researcher", "quiz_generator")
  .addEdge("quiz_generator", "scheduler")
  .addEdge("scheduler", END);

const app = workflow.compile();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, userId } = body;
    
    if (!goal || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" }, 
        { status: 400 }
      );
    }

    console.log(`🚀 Generating roadmap: ${goal}`);
    
    await app.invoke({ 
      userId, 
      goal, 
      timebox: null,
      milestones: [], 
      enrichedMilestones: [],
      quizzes: []
    });
    
    return NextResponse.json({ success: true });
    
  } catch (e: any) {
    console.error("❌ Error:", e);
    return NextResponse.json(
      { success: false, error: e.message }, 
      { status: 500 }
    );
  }
}