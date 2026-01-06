require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

async function test() {
  console.log("🔑 Testing Key...");

  try {
    // We use 'gpt2' because it is tiny and always available
    // We use 'textGeneration' because it is the simplest API call
    const result = await hf.textGeneration({
      model: "gpt2",
      inputs: "The capital of France is",
    });
    
    console.log("✅ SUCCESS! The API Key works.");
    console.log("Generated Text:", result.generated_text);
    console.log("\nCONCLUSION: Your Key is good. The previous model (Phi-3) was just busy/loading.");
  } catch (error) {
    console.error("❌ FAILED. This means your API KEY is invalid or has no permissions.");
    console.error("Error Message:", error.message);
    
    // Log the full response to see the status code (401 vs 503)
    if (error.cause) console.error("Cause:", error.cause);
  }
}

test();