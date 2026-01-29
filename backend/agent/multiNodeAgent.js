import { StateGraph } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
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

/**
 * Node 1: Generate 5 search queries from the original prompt
 */
async function generateSearchQueries(state) {
  const { sendEvent } = state;

  if (sendEvent) {
    sendEvent("action", {
      step: "generate_queries",
      message: "Generating search queries...",
      timestamp: new Date().toISOString(),
    });
  }

  console.log(
    `\n📝 Node 1: Generating search queries for: "${state.originalPrompt}"`,
  );

  const prompt = `You are an expert at breaking down user prompts into multiple search queries.
Given the following user prompt, generate exactly 5 diverse and specific search queries that will help gather comprehensive information to answer the user's question.

User Prompt: "${state.originalPrompt}"

Return ONLY the 5 queries, one per line, without numbering or bullet points.`;

  const message = new HumanMessage(prompt);
  const response = await llm.invoke([message]);

  const searchQueries = response.content
    .toString()
    .split("\n")
    .filter((query) => query.trim().length > 0)
    .slice(0, 5);

  console.log(`✅ Generated ${searchQueries.length} search queries:`);
  searchQueries.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));

  if (sendEvent) {
    sendEvent("queries_generated", {
      queries: searchQueries,
      count: searchQueries.length,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    searchQueries,
    messages: [message, new AIMessage(response.content.toString())],
    sendEvent,
  };
}

/**
 * Node 2: Generate context for each search query
 */
async function generateContexts(state) {
  const { sendEvent } = state;

  console.log(
    `\n🌐 Node 2: Generating contexts for ${state.searchQueries.length} queries`,
  );

  if (sendEvent) {
    sendEvent("action", {
      step: "fetching_contexts",
      message: `Fetching contexts for ${state.searchQueries.length} queries...`,
      totalQueries: state.searchQueries.length,
      timestamp: new Date().toISOString(),
    });
  }

  const contexts = [];
  const allSearchResults = new Map();

  for (let i = 0; i < state.searchQueries.length; i++) {
    const query = state.searchQueries[i];
    console.log(
      `   Fetching context for query ${i + 1}/${state.searchQueries.length}: "${query}"`,
    );

    if (sendEvent) {
      sendEvent("query_progress", {
        currentQuery: i + 1,
        totalQueries: state.searchQueries.length,
        query: query,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Extract search results from search for display - do this FIRST
      const { search } = await import("../models/searchengine.js");
      const searchResults = await search(query);

      // Add ALL results from search to map (deduplicates by URL)
      searchResults.forEach((r) => {
        if (!allSearchResults.has(r.link)) {
          allSearchResults.set(r.link, {
            title: r.title || "Untitled",
            url: r.link,
          });
        }
      });

      // Emit search results in real-time after each query with ALL accumulated results
      if (sendEvent && allSearchResults.size > 0) {
        sendEvent("search_results", {
          results: Array.from(allSearchResults.values()),
          count: allSearchResults.size,
          isStreaming: true,
          queryIndex: i + 1,
          timestamp: new Date().toISOString(),
        });
      }

      const context = await getContextForPrompt(query, {
        maxResults: 2,
        topK: 3,
        cleanup: true,
        sendEvent,
      });
      contexts.push(context);
    } catch (error) {
      console.error(`   Error fetching context for query: ${error.message}`);
      contexts.push(`[Failed to retrieve context for: "${query}"]`);
    }
  }

  console.log(`✅ Retrieved contexts for all ${contexts.length} queries`);

  return { contexts, sendEvent };
}

/**
 * Node 3: Summarize all contexts into a comprehensive answer
 */
async function summarizeContexts(state) {
  const { sendEvent } = state;

  console.log(`\n📋 Node 3: Summarizing all contexts`);

  if (sendEvent) {
    sendEvent("action", {
      step: "summarizing",
      message: "Synthesizing information and generating answer...",
      timestamp: new Date().toISOString(),
    });
  }

  const contextsSummary = state.contexts
    .map((ctx, i) => `\n--- Context from Query ${i + 1} ---\n${ctx}`)
    .join("\n");

  const prompt = `You are an expert summarizer and researcher. You have gathered information from multiple sources based on different search angles for the user's original question.

Original User Question: "${state.originalPrompt}"

Gathered Information:
${contextsSummary}

Please provide a comprehensive, well-structured answer that:
1. Directly addresses the user's original question
2. Synthesizes information from all the gathered contexts
3. Highlights key points and insights
4. Provides sources/references where relevant
5. Is clear, concise, and actionable`;

  const message = new HumanMessage(prompt);
  const response = await llm.invoke([message]);

  const finalSummary = response.content.toString();

  console.log(`✅ Summary generated successfully`);

  return {
    finalSummary,
    messages: [...state.messages, message, new AIMessage(finalSummary)],
    sendEvent,
  };
}

/**
 * Create the LangGraph workflow
 */
function createAgentGraph() {
  const graph = new StateGraph({
    channels: {
      originalPrompt: {
        value: null,
        default: "",
      },
      searchQueries: {
        value: null,
        default: [],
      },
      contexts: {
        value: null,
        default: [],
      },
      finalSummary: {
        value: null,
        default: "",
      },
      messages: {
        value: null,
        default: [],
      },
      sendEvent: {
        value: null,
        default: null,
      },
    },
  });

  // Add nodes
  graph.addNode("generate_queries", generateSearchQueries);
  graph.addNode("generate_contexts", generateContexts);
  graph.addNode("summarize", summarizeContexts);

  // Add edges - sequential workflow
  graph.addEdge("__start__", "generate_queries");
  graph.addEdge("generate_queries", "generate_contexts");
  graph.addEdge("generate_contexts", "summarize");
  graph.addEdge("summarize", "__end__");

  return graph.compile();
}

const agentGraph = createAgentGraph();

/**
 * Run the multi-node agent workflow
 * @param {string} userPrompt - The user's question/prompt
 * @param {Function} sendEvent - Optional callback to send SSE events
 * @returns {Promise<string>} The final summary response
 */
async function runMultiNodeAgent(userPrompt, sendEvent = null) {
  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🚀 Starting Multi-Node Agent Workflow`);
    console.log(`📌 User Prompt: "${userPrompt}"`);
    console.log(`${"=".repeat(60)}`);

    const initialState = {
      originalPrompt: userPrompt,
      searchQueries: [],
      contexts: [],
      finalSummary: "",
      messages: [new HumanMessage(userPrompt)],
      sendEvent,
    };

    const result = await agentGraph.invoke(initialState);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ Workflow Complete`);
    console.log(`${"=".repeat(60)}\n`);

    return result.finalSummary;
  } catch (error) {
    console.error("Error running multi-node agent:", error);
    throw error;
  }
}

export { runMultiNodeAgent, agentGraph };
