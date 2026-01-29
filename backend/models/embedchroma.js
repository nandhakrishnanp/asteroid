import * as chromadb from "chromadb";
import { embedTexts } from "./embedgemma.js";

// Initialize ChromaDB client
const client = new chromadb.ChromaClient({
  path: "http://localhost:8000",
});

// Custom embedding function that tells ChromaDB we provide our own embeddings
class CustomEmbeddingFunction {
  constructor() {
    // ChromaDB expects this property
  }

  async generate(texts) {
    // This won't be called because we provide embeddings directly
    return await embedTexts(texts);
  }
}

/**
 * Chunk text into smaller pieces
 * @param {string} text - The text to chunk
 * @param {number} chunkSize - Maximum characters per chunk
 * @param {number} overlap - Number of characters to overlap between chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;

    // Avoid infinite loop if we're at the end
    if (end === text.length) break;
  }

  return chunks;
}

/**
 * Add documents to ChromaDB collection with embeddings (auto-chunks large documents)
 * @param {string} collectionName - Name of the collection
 * @param {string[]} documents - Array of documents to add
 * @param {Object} options - Options for adding documents
 * @param {Object} options.metadata - Optional metadata for documents
 * @param {boolean} options.autoChunk - Whether to automatically chunk large documents (default: true)
 * @param {number} options.maxChunkSize - Maximum characters per chunk (default: 500)
 * @param {number} options.chunkOverlap - Number of characters to overlap (default: 50)
 * @returns {Promise<Object>} Result of the add operation
 */
async function addDocuments(collectionName, documents, options = {}) {
  const {
    metadata = {},
    autoChunk = true,
    maxChunkSize = 500,
    chunkOverlap = 50,
  } = options;

  try {
    const collection = await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: new CustomEmbeddingFunction(),
    });

    let processedDocs = [];
    let processedMetadatas = [];

    // Process each document - chunk if too large
    documents.forEach((doc, docIndex) => {
      if (autoChunk && doc.length > maxChunkSize) {
        // Document is too large, chunk it
        const chunks = chunkText(doc, maxChunkSize, chunkOverlap);
        console.log(
          `Document ${docIndex} chunked into ${chunks.length} pieces`,
        );

        chunks.forEach((chunk, chunkIndex) => {
          processedDocs.push(chunk);
          processedMetadatas.push({
            ...metadata,
            timestamp: new Date().toISOString(),
            length: chunk.length,
            originalIndex: docIndex,
            isChunked: true,
            chunkIndex: chunkIndex,
            totalChunks: chunks.length,
          });
        });
      } else {
        // Document is small enough, add as-is
        processedDocs.push(doc);
        processedMetadatas.push({
          ...metadata,
          timestamp: new Date().toISOString(),
          length: doc.length,
          originalIndex: docIndex,
          isChunked: false,
        });
      }
    });

    // Generate embeddings for all processed documents
    const embeddings = await embedTexts(processedDocs);

    // Generate IDs
    const ids = processedDocs.map((_, index) => `doc_${Date.now()}_${index}`);

    // Add to collection
    await collection.add({
      ids: ids,
      embeddings: embeddings,
      documents: processedDocs,
      metadatas: processedMetadatas,
    });

    console.log(
      `Added ${processedDocs.length} documents (from ${documents.length} original) to collection '${collectionName}'.`,
    );

    return {
      success: true,
      originalCount: documents.length,
      storedCount: processedDocs.length,
      ids,
    };
  } catch (error) {
    console.error("Error adding documents:", error);
    throw error;
  }
}

/**
 * Add chunked text to ChromaDB collection
 * @param {string} collectionName - Name of the collection
 * @param {string} text - Text to chunk and store
 * @param {number} chunkSize - Maximum characters per chunk
 * @param {number} overlap - Number of characters to overlap
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Result of the add operation
 */
async function addChunkedText(
  collectionName,
  text,
  chunkSize = 500,
  overlap = 50,
  metadata = {},
) {
  const chunks = chunkText(text, chunkSize, overlap);
  console.log(`Chunked text into ${chunks.length} pieces`);

  return await addDocuments(collectionName, chunks, {
    metadata: {
      ...metadata,
      chunked: true,
      chunkSize: chunkSize,
      overlap: overlap,
    },
    autoChunk: false, // Already chunked manually
  });
}

/**
 * Query ChromaDB collection
 * @param {string} collectionName - Name of the collection
 * @param {string|string[]} queryTexts - Query text(s)
 * @param {number} nResults - Number of results to return
 * @returns {Promise<Object>} Query results
 */
async function queryDocuments(collectionName, queryTexts, nResults = 5) {
  try {
    const collection = await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: new CustomEmbeddingFunction(),
    });

    // Ensure queryTexts is an array
    const queries = Array.isArray(queryTexts) ? queryTexts : [queryTexts];

    // Generate embeddings for queries
    const queryEmbeddings = await embedTexts(queries);

    // Query the collection
    const results = await collection.query({
      queryEmbeddings: queryEmbeddings,
      nResults: nResults,
    });

    console.log(`Found ${results.ids[0].length} results for query`);

    return results;
  } catch (error) {
    console.error("Error querying documents:", error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} All documents in the collection
 */
async function getAllDocuments(collectionName) {
  try {
    const collection = await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: new CustomEmbeddingFunction(),
    });

    const results = await collection.get();

    console.log(
      `Retrieved ${results.ids.length} documents from '${collectionName}'`,
    );

    return results;
  } catch (error) {
    console.error("Error getting documents:", error);
    throw error;
  }
}

/**
 * Delete a collection
 * @param {string} collectionName - Name of the collection to delete
 * @returns {Promise<void>}
 */
async function deleteCollection(collectionName) {
  try {
    await client.deleteCollection({ name: collectionName });
    console.log(`Deleted collection '${collectionName}'`);
  } catch (error) {
    console.error("Error deleting collection:", error);
    throw error;
  }
}

/**
 * List all collections
 * @returns {Promise<Array>} Array of collection objects
 */
async function listCollections() {
  try {
    const collections = await client.listCollections();
    console.log(`Found ${collections.length} collections`);
    return collections;
  } catch (error) {
    console.error("Error listing collections:", error);
    throw error;
  }
}

export {
  chunkText,
  addDocuments,
  addChunkedText,
  queryDocuments,
  getAllDocuments,
  deleteCollection,
  listCollections,
};
