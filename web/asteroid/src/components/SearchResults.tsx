"use client";

import { motion } from "framer-motion";
import { ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";

interface SearchResult {
  title: string;
  url: string;
  favicon?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
}

export default function SearchResults({ results }: SearchResultsProps) {
  const [loadedFavicons, setLoadedFavicons] = useState<Record<string, boolean>>(
    {},
  );

  const handleFaviconLoad = (url: string) => {
    setLoadedFavicons((prev) => ({
      ...prev,
      [url]: true,
    }));
  };

  const getFaviconUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
    } catch {
      return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333333" width="100" height="100" rx="10"/><text x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="%23ffffff" font-weight="bold">?</text></svg>`;
    }
  };

  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "source";
    }
  };

  if (results.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-12 pt-8 border-t border-white/10 space-y-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <MapPin className="w-4 h-4 text-white/60" />
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          Sources & References ({results.length})
        </h3>
      </motion.div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-4">
        {results.map((result, index) => (
          <motion.a
            key={`${result.url}-${index}`}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.05,
              duration: 0.25,
              ease: "easeOut",
            }}
            whileHover={{
              scale: 1.01,
              y: -1,
            }}
            whileTap={{ scale: 0.99 }}
            className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm hover:border-white/20 hover:bg-white/8 transition-all duration-300"
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/0 transition-all duration-300" />

            <div className="relative z-10 flex items-center gap-2">
              {/* Favicon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 + 0.05 }}
                className="shrink-0"
              >
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center overflow-hidden border border-white/15">
                  <img
                    src={getFaviconUrl(result.url)}
                    alt={getDomain(result.url)}
                    className="w-4 h-4 object-contain"
                    onLoad={() => handleFaviconLoad(result.url)}
                    onError={() => {
                      // Favicon failed to load
                    }}
                  />
                </div>
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <motion.h4
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.08 }}
                  className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors truncate"
                >
                  {result.title || getDomain(result.url)}
                </motion.h4>

                {/* URL */}
                <motion.p
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors truncate mt-0.5"
                >
                  {getDomain(result.url)}
                </motion.p>
              </div>

              {/* External Link Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.12 }}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60" />
              </motion.div>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
}
