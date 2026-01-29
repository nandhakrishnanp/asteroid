import express from "express";
import { runMultiNodeAgent } from "../agent/multiNodeAgent.js";

const router = express.Router();

/**
 * POST /api/agent/chat
 * Send a prompt to the AI agent with Server-Sent Events streaming
 *
 * Request body:
 * {
 *   "prompt": "What is machine learning?",
 *   "sessionId": "optional-unique-session-id"
 * }
 *
 * Response: Server-Sent Events stream with progress updates
 */
router.post("/chat", async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid input. 'prompt' must be a non-empty string.",
      });
    }

    if (prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Prompt cannot be empty.",
      });
    }

    // Generate a session ID if not provided
    const finalSessionId =
      sessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`\n📨 Received prompt: "${prompt}"`);
    console.log(`📍 Session ID: ${finalSessionId}`);

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Helper function to send SSE events
    const sendEvent = (eventType, data) => {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial event
    sendEvent("start", {
      message: "Agent started processing your request",
      sessionId: finalSessionId,
      timestamp: new Date().toISOString(),
    });

    // Run the multi-node agent with event callbacks
    const response = await runMultiNodeAgent(prompt, sendEvent);

    // Send final response
    sendEvent("complete", {
      response,
      sessionId: finalSessionId,
      timestamp: new Date().toISOString(),
    });

    res.end();
  } catch (error) {
    console.error("Error in /chat endpoint:", error);

    // Try to send error event if connection is still open
    try {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } catch (e) {
      // Connection may be closed
    }

    res.end();
  }
});

export default router;
