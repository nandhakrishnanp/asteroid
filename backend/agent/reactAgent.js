import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getContextForPrompt } from "../models/contextGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Initialize the LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
});

// Define the GenContext tool
const genContextTool = tool(
  async ({ query, maxResults = 3, topK = 5 }) => {
    try {
      console.log(`🛠️ GenContext Tool: Fetching context for: "${query}"`);
      const context = await getContextForPrompt(query, {
        maxResults,
        topK,
        cleanup: true,
      });
      return context;
    } catch (error) {
      return `Error fetching context: ${error.message}`;
    }
  },
  {
    name: "genContext",
    description:
      "Searches the web, scrapes content, embeds it in ChromaDB, and retrieves relevant context for a given query. Use this when you need current information from the web to answer user questions.",
    schema: z.object({
      query: z.string().describe("The search query to fetch context for"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of web pages to scrape (default: 3)"),
      topK: z
        .number()
        .optional()
        .describe("Number of most relevant chunks to retrieve (default: 5)"),
    }),
  },
);

// Define tools array
const tools = [genContextTool];

// Create agent with memory
const memory = new MemorySaver();

const agentExecutor = await createReactAgent({
  llm,
  tools,
  checkpointSaver: memory,
  prompt: `
You are a helpful AI assistant that uses tools to fetch relevant context from the web to answer user questions. When given a user prompt, decide if you need to use the "genContext" tool to gather information. If so, use the tool with appropriate parameters. Once you have sufficient context, provide a comprehensive answer to the user's question.
Always aim to provide accurate and context-rich responses based on the information you gather.

  `,
});

/**
 * Run the agent with a user prompt
 * @param {string} userPrompt - The user's question/prompt
 * @param {string} sessionId - Unique session ID for conversation memory
 * @returns {Promise<string>} The agent's response
 */
async function runAgent(userPrompt, sessionId = "default") {
  try {
    console.log(`\n🤖 Agent running with prompt: "${userPrompt}"`);

    const config = { configurable: { thread_id: sessionId } };

    const result = await agentExecutor.invoke(
      {
        messages: [new HumanMessage(userPrompt)],
      },
      config,
    );

    // Extract the final response
    const lastMessage = result.messages[result.messages.length - 1];
    const response =
      lastMessage.content || "No response generated. Please try again.";

    console.log(`✅ Agent response generated`);
    return response;
  } catch (error) {
    console.error("Error running agent:", error);
    throw error;
  }
}

export { runAgent, agentExecutor };
