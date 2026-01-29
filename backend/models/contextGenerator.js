import {
  addDocuments,
  queryDocuments,
  deleteCollection,
} from "./embedchroma.js";
import { search } from "./searchengine.js";
import { scrapeUrlList } from "./scrapeEngine.js";

/**
 * Search, scrape, embed, and retrieve context for a given prompt
 * @param {string} prompt - The user's query/prompt
 * @param {Object} options - Configuration options
 * @param {number} options.maxResults - Maximum search results to process (default: 3)
 * @param {number} options.topK - Number of most relevant chunks to return (default: 5)
 * @param {boolean} options.cleanup - Whether to delete collection after query (default: true)
 * @param {Function} options.sendEvent - Optional callback to send events
 * @returns {Promise<string>} context - Aggregated context from relevant web sources
 */
async function getContextForPrompt(prompt, options = {}) {
  const {
    maxResults = 3,
    topK = 5,
    cleanup = true,
    sendEvent = null,
  } = options;

  const collectionName = `context_${Date.now()}`;

  try {
    // Step 1: Search the web
    console.log(`🔍 Searching for: "${prompt}"`);
    const searchResults = await search(prompt);

    if (searchResults.length === 0) {
      console.log("No search results found.");
      return "No relevant context found for the given prompt.";
    }

    console.log(`Found ${searchResults.length} search results`);

    // Send all search URLs as event
    if (sendEvent) {
      sendEvent("search_results", {
        query: prompt,
        urls: searchResults.map((r) => ({
          title: r.title,
          url: r.link,
        })),
        totalResults: searchResults.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Scrape the URLs
    console.log(`\n📄 Scraping top ${maxResults} pages...`);
    const urlsToScrape = searchResults.slice(0, maxResults).map((r) => r.link);

    if (sendEvent) {
      sendEvent("action", {
        step: "scraping",
        message: `Scraping ${urlsToScrape.length} web pages...`,
        urls: urlsToScrape,
        timestamp: new Date().toISOString(),
      });
    }

    const scrapedData = await scrapeUrlList(urlsToScrape);

    // Filter out empty results
    const validResults = scrapedData.filter(
      (item) => item.content.length > 100,
    );
    console.log(`Successfully scraped ${validResults.length} pages`);

    if (validResults.length === 0) {
      return "Could not retrieve valid content from web sources.";
    }

    // Step 3: Store in ChromaDB with auto-chunking
    console.log(`\n💾 Embedding and storing content...`);

    if (sendEvent) {
      sendEvent("action", {
        step: "embedding",
        message: `Embedding and storing ${validResults.length} documents...`,
        timestamp: new Date().toISOString(),
      });
    }

    const documents = validResults.map((item) => item.content.slice(0, 10000));
    const metadata = validResults.map((item, index) => ({
      url: item.url,
      title: searchResults[index]?.title || "Untitled",
      source: "web_search",
    }));

    // Store all documents
    for (let i = 0; i < documents.length; i++) {
      await addDocuments(collectionName, [documents[i]], {
        metadata: metadata[i],
        maxChunkSize: 500,
        chunkOverlap: 50,
      });
    }

    // Step 4: Query the stored data
    console.log(`\n🎯 Retrieving relevant context...`);

    if (sendEvent) {
      sendEvent("action", {
        step: "retrieving",
        message: "Retrieving most relevant information...",
        timestamp: new Date().toISOString(),
      });
    }

    const queryResults = await queryDocuments(collectionName, prompt, topK);

    // Step 5: Aggregate context from top results
    let context = "";
    queryResults.documents[0].forEach((doc, index) => {
      const meta = queryResults.metadatas[0][index];
      context += `\n--- Source ${index + 1}: ${meta.title} ---\n`;
      context += `URL: ${meta.url}\n`;
      context += `${doc}\n`;
    });

    // Step 6: Cleanup
    if (cleanup) {
      await deleteCollection(collectionName);
      console.log(`\n🧹 Cleaned up collection`);
    }

    console.log(`\n✅ Context retrieved successfully!\n`);
    return context.trim();
  } catch (error) {
    console.error("Error in getContextForPrompt:", error);
    // Cleanup on error
    try {
      if (cleanup) {
        await deleteCollection(collectionName);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

export { getContextForPrompt };
