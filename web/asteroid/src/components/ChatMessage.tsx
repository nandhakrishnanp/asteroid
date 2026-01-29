"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

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

interface ChatMessageProps {
  message: Message;
  index: number;
}

export default function ChatMessage({ message, index }: ChatMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isAnimating, setIsAnimating] = useState(true);

  // Animate text for assistant messages
  useEffect(() => {
    if (message.type === "assistant" && isAnimating) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= message.content.length) {
          setDisplayedContent(message.content.slice(0, currentIndex));
          currentIndex++;
        } else {
          setIsAnimating(false);
          clearInterval(interval);
        }
      }, 5);

      return () => clearInterval(interval);
    } else if (message.type === "user") {
      setDisplayedContent(message.content);
      setIsAnimating(false);
    }
  }, [message, isAnimating]);

  const isUser = message.type === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Avatar */}
      {!isUser && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </motion.div>
      )}

      {/* Message Container */}
      <div className={`max-w-2xl ${isUser ? "" : "flex-1"}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: isUser ? 0 : 0.15 }}
          className={`rounded-xl px-4 py-3 ${
            isUser
              ? "bg-white/10 text-white rounded-br-none border border-white/20"
              : "bg-white/5 border border-white/10 text-gray-100 rounded-bl-none"
          }`}
        >
          {/* Message Text */}
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {displayedContent}
            </p>
          ) : (
            <>
              <div className="text-sm leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-3 last:mb-0">{children}</p>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-2 mt-4">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mb-2 mt-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-bold mb-2 mt-2">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-3 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-3 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="ml-2">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-white/20 pl-3 py-1 my-2 italic text-gray-400">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-white/10 p-3 rounded-lg overflow-x-auto my-2">
                        {children}
                      </pre>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/60 hover:text-white/80 underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {displayedContent}
                </ReactMarkdown>
              </div>
              {isAnimating && (
                <motion.span
                  animate={{ opacity: [0, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block ml-1 w-2 h-5 bg-white/50 rounded-sm"
                />
              )}
            </>
          )}
        </motion.div>

        {/* Timestamp */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-gray-500 mt-2"
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </motion.p>
      </div>

      {/* User Avatar */}
      {isUser && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
