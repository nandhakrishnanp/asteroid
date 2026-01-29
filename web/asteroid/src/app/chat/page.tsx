"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader, Sparkles } from "lucide-react";
import ChatMessage from "../../components/ChatMessage";
import SearchResults from "../../components/SearchResults";
import ProcessingSteps from "../../components/ProcessingSteps";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  searchResults?: Array<{
    title: string;
    url: string;
    favicon?: string;
  }>;
}

interface SearchResult {
  title: string;
  url: string;
  favicon?: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  completed: boolean;
  current: boolean;
  timestamp?: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSearchResults, setCurrentSearchResults] = useState<
    SearchResult[]
  >([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateStep = (
    stepId: string,
    completed: boolean = false,
    current: boolean = false,
  ) => {
    setProcessingSteps((prev) => {
      const existing = prev.find((s) => s.id === stepId);
      if (existing) {
        return prev.map((s) =>
          s.id === stepId
            ? {
                ...s,
                completed,
                current,
                timestamp: completed || current ? new Date() : s.timestamp,
              }
            : { ...s, current: false },
        );
      }
      return [
        ...prev,
        {
          id: stepId,
          name: getStepName(stepId),
          completed,
          current,
          timestamp: completed || current ? new Date() : undefined,
        },
      ];
    });
  };

  const getStepName = (stepId: string): string => {
    const names: Record<string, string> = {
      start: "Request Received",
      generate_queries: "Generating Search Queries",
      fetching_contexts: "Fetching Web Content",
      search_results: "Found Sources",
      summarizing: "Synthesizing Answer",
      complete: "Complete",
    };
    return names[stepId] || stepId;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userInput = input;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setCurrentSearchResults([]);
    setProcessingSteps([]);
    setStartTime(new Date());

    try {
      const response = await fetch("http://localhost:3001/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userInput,
          sessionId: `session_${Date.now()}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantContent = "";
      const assistantId = Date.now().toString();
      const finalSearchResults: SearchResult[] = [];

      const decoder = new TextDecoder();
      let buffer = "";

      // Start event
      updateStep("start", true, false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          if (line.startsWith("event:")) {
            const eventType = line.substring(6).trim();

            if (i + 1 < lines.length && lines[i + 1].startsWith("data:")) {
              const dataLine = lines[i + 1].substring(5).trim();

              try {
                const data = JSON.parse(dataLine);

                if (eventType === "queries_generated") {
                  updateStep("generate_queries", true, false);
                } else if (eventType === "query_progress") {
                  updateStep("fetching_contexts", false, true);
                } else if (eventType === "search_results") {
                  updateStep("search_results", false, true);
                  const results = Array.isArray(data.results)
                    ? data.results
                    : [];
                  const processedResults = await Promise.all(
                    results.map(async (result: any) => ({
                      title: result.title,
                      url: result.url,
                      favicon: await getFaviconUrl(result.url),
                    })),
                  );

                  // Update final results
                  const existingUrls = new Set(
                    finalSearchResults.map((r) => r.url),
                  );
                  processedResults.forEach((result) => {
                    if (!existingUrls.has(result.url)) {
                      finalSearchResults.push(result);
                    }
                  });
                  setCurrentSearchResults([...finalSearchResults]);
                } else if (eventType === "complete") {
                  assistantContent = data.response || "";
                  updateStep("summarizing", true, false);
                  updateStep("complete", true, false);
                }
              } catch (e) {
                console.error("Error parsing event data:", e);
              }
            }
          }
        }
      }

      // Add assistant message with search results
      const assistantMessage: Message = {
        id: assistantId,
        type: "assistant",
        content: assistantContent,
        timestamp: new Date(),
        searchResults: finalSearchResults,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentSearchResults([]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "Sorry, there was an error processing your request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black pt-16">
      {/* Header */}
     

      {/* Processing Steps Panel */}
      {isLoading && startTime && (
        <ProcessingSteps steps={processingSteps} startTime={startTime} />
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-8">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-96 flex flex-col items-center justify-center text-center"
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-semibold text-white mb-3">
                    Welcome
                  </h2>
                  <p className="text-lg text-gray-400">
                    Ask anything and get comprehensive, researched answers with
                    sources
                  </p>
                </div>
                <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { icon: "🔍", label: "Research" },
                    { icon: "📊", label: "Analysis" },
                    { icon: "📚", label: "Sources" },
                  ].map((item) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-5 rounded-lg border border-white/10 bg-white/5 backdrop-blur"
                    >
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <p className="text-base text-gray-300">{item.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <div key={message.id}>
                  <ChatMessage message={message} index={0} />
                  {message.type === "assistant" &&
                    message.searchResults &&
                    message.searchResults.length > 0 && (
                      <SearchResults results={message.searchResults} />
                    )}
                </div>
              ))}
            </AnimatePresence>
          )}

          {isLoading && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-gray-300"
              >
                <Loader className="w-6 h-6 animate-spin text-white/60" />
                <span className="text-base font-medium">
                  Researching your question...
                </span>
              </motion.div>

              {currentSearchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <SearchResults results={currentSearchResults} />
                </motion.div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-black/50 backdrop-blur-xl sticky bottom-0">
        <div className="max-w-4xl mx-auto w-full p-6">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-5 py-4 rounded-lg bg-white/10 border border-white/20 text-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors"
              disabled={isLoading}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-8 py-4 rounded-lg bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send
            </motion.button>
          </form>
          <p className="text-sm text-gray-600 mt-3">
            Always verify important information
          </p>
        </div>
      </div>
    </div>
  );
}

async function getFaviconUrl(url: string): Promise<string> {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>`;
  }
}
