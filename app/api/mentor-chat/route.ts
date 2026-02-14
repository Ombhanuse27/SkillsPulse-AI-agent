import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Initialize LLM with strict settings to prevent stuttering
const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.2,
  apiKey: process.env.GROQ_API_KEY,
  streaming: true,
  maxTokens: 2000,
});

// Helper: Simulate thinking delay
async function simulateThinking(controller: ReadableStreamDefaultController, seconds: number = 2) {
  const thinkingMessage = JSON.stringify({ type: 'thinking', duration: seconds * 1000 }) + '\n';
  controller.enqueue(new TextEncoder().encode(thinkingMessage));
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Helper: Format conversation history for context
function formatChatHistory(history: any[]): string {
  if (!history || history.length === 0) return "This is the start of the conversation.";
  
  return history
    .slice(-6) // Last 6 messages for context
    .map(msg => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.text}`)
    .join('\n');
}

// ==========================================
// TEACHING AGENT
// ==========================================
async function handleTeaching(
  message: string,
  context: string,
  chatHistory: any[],
  controller: ReadableStreamDefaultController
) {
  const conversationContext = formatChatHistory(chatHistory);
  
  const systemPrompt = `You are Neural Mentor, an elite technical instructor specializing in: ${context}

CRITICAL RULES:
1. **NO REPETITION** - Never repeat yourself or the user's question
2. **START IMMEDIATELY** - Begin with your answer, no preamble
3. **BE CONCISE** - 200-300 words maximum unless code examples are needed
4. **USE MARKDOWN** - Bold key terms, use bullets, include code blocks with proper language tags
5. **BUILD ON CONTEXT** - Reference previous conversation when relevant

CONVERSATION SO FAR:
${conversationContext}

CURRENT QUESTION: "${message}"

Provide a clear, expert-level explanation that builds on our conversation.`;

  await simulateThinking(controller, 2);

  const stream = await llm.stream([
    new SystemMessage(systemPrompt),
    new HumanMessage(message)
  ]);

  const contentMessage = JSON.stringify({ type: 'content' }) + '\n';
  controller.enqueue(new TextEncoder().encode(contentMessage));

  let buffer = '';
  for await (const chunk of stream) {
    if (chunk.content) {
      const text = chunk.content.toString();
      buffer += text;
      
      // Send chunk
      const dataMessage = JSON.stringify({ type: 'data', content: text }) + '\n';
      controller.enqueue(new TextEncoder().encode(dataMessage));
    }
  }
}

// ==========================================
// QUIZ AGENT
// ==========================================
async function handleQuiz(
  context: string,
  controller: ReadableStreamDefaultController
) {
  const systemPrompt = `You are Quiz Master, creating challenging assessments for: ${context}

TASK: Create ONE multiple-choice question.

CRITICAL FORMAT (MUST FOLLOW EXACTLY):
{
  "question": "Your challenging question here",
  "options": [
    "First option",
    "Second option", 
    "Third option",
    "Fourth option"
  ],
  "correctIndex": 0,
  "explanation": "Brief explanation why this is correct (1 sentence)"
}

RULES:
- Question must test deep understanding
- All options must be plausible
- Explanation should be concise (max 20 words)
- Return ONLY valid JSON, no markdown, no extra text

Generate quiz now:`;

  await simulateThinking(controller, 2);

  const result = await llm.invoke([new SystemMessage(systemPrompt)]);
  
  try {
    const content = result.content.toString();
    const cleanJson = content.replace(/```json|```/g, '').trim();
    const quizData = JSON.parse(cleanJson);
    
    // Validate structure
    if (!quizData.question || !Array.isArray(quizData.options) || quizData.options.length !== 4) {
      throw new Error("Invalid quiz structure");
    }
    
    const quizMessage = JSON.stringify({ type: 'quiz', data: quizData }) + '\n';
    controller.enqueue(new TextEncoder().encode(quizMessage));
    
  } catch (error) {
    console.error("Quiz parsing error:", error);
    
    // Fallback quiz
    const fallbackQuiz = {
      question: `What is a key concept in ${context}?`,
      options: [
        "Understanding the fundamental principles",
        "Memorizing syntax",
        "Copying code examples",
        "Skipping documentation"
      ],
      correctIndex: 0,
      explanation: "Understanding fundamentals is crucial for mastery."
    };
    
    const quizMessage = JSON.stringify({ type: 'quiz', data: fallbackQuiz }) + '\n';
    controller.enqueue(new TextEncoder().encode(quizMessage));
  }
}

// ==========================================
// EXPLAIN AGENT
// ==========================================
async function handleExplain(
  context: string,
  controller: ReadableStreamDefaultController
) {
  const systemPrompt = `You are Concept Architect, explaining: ${context}

STRUCTURE (MUST FOLLOW):

### The Core Concept
[2-3 sentences explaining what this is]

### Why It Matters
- Benefit 1
- Benefit 2
- Benefit 3

### How It Works
[Brief explanation with a code example if relevant]

\`\`\`javascript
// Clean, production-ready example
\`\`\`

### Key Takeaway
[One sentence summary]

RULES:
- Be concise (max 300 words)
- Use clear markdown formatting
- Include practical code example
- No repetition`;

  await simulateThinking(controller, 2);

  const stream = await llm.stream([new SystemMessage(systemPrompt)]);

  const contentMessage = JSON.stringify({ type: 'content' }) + '\n';
  controller.enqueue(new TextEncoder().encode(contentMessage));

  for await (const chunk of stream) {
    if (chunk.content) {
      const text = chunk.content.toString();
      const dataMessage = JSON.stringify({ type: 'data', content: text }) + '\n';
      controller.enqueue(new TextEncoder().encode(dataMessage));
    }
  }
}

// ==========================================
// API HANDLER
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const { message, context, mode = 'chat', chatHistory = [] } = await req.json();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (mode === 'quiz') {
            await handleQuiz(context, controller);
          } else if (mode === 'explain') {
            await handleExplain(context, controller);
          } else {
            await handleTeaching(message, context, chatHistory, controller);
          }
          
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorMessage = JSON.stringify({ 
            type: 'error', 
            message: 'Failed to generate response' 
          }) + '\n';
          controller.enqueue(new TextEncoder().encode(errorMessage));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      },
    });

  } catch (e: any) {
    console.error("API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}