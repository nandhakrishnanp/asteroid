"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface PageProps {}

const Page = ({}: PageProps) => {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [imgUrl, setImgUrl] = useState("");

  // Use refs to avoid recreating intervals and prevent memory leaks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Memoize the fetch function to prevent recreation on every render
  const fetchBrowserImage = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:3001/screenshot");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setImgUrl(data.screenshot);
    } catch (error) {
      console.error("Error fetching browser image:", error);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    // Clear previous data
    setData(null);
    setImgUrl("");

   
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    try {
      const url = new URL("http://localhost:3001/stream");
      url.searchParams.append("q", query);

      const newEventSource = new EventSource(url.toString());

      newEventSource.onmessage = (event) => {
        let temp = event.data;
        console.log("Received event data:", temp);
        setData(event.data);
      };

      newEventSource.onerror = (error) => {
        console.error("EventSource encountered an error:", error);
        newEventSource.close();
        setIsStreaming(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };

      eventSourceRef.current = newEventSource;
      setEventSource(newEventSource);
      setIsStreaming(true);

      // Start the screenshot polling interval
      intervalRef.current = setInterval(() => {
        fetchBrowserImage();
      }, 1000);
    } catch (error) {
      console.error("Error initiating EventSource:", error);
      setIsStreaming(false);
    }
  }, [query, fetchBrowserImage]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Stop polling when streaming ends
  useEffect(() => {
    if (!isStreaming && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isStreaming]);

  return (
    <div className="w-full flex-col items-center justify-center flex h-screen bg-black">
     {
      !isStreaming && !data && (
         <div className="w-full">
        <div className="text-white flex flex-col items-center justify-center space-y-3">
          <h1 className="text-7xl font-sans">Agent Asteroid</h1>
          <p className="font-light">Web intelligence unleashed</p>
        </div>

        <div className="mt-10 w-full flex items-center justify-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="AskAgent: Schedule a meeting for me tomorrow at 10am"
            className="py-3 w-1/3 rounded-2xl border-2 text-white placeholder:text-white px-3 placeholder:opacity-80 border-gray-300 focus:outline-none bg-transparent"
          />
        </div>
      </div>
      )
     }

      {data  && (
        <div className="text-white flex-row flex p-11 ">
          {imgUrl && (
            <div className=" w-2/3">
              <img
                src={imgUrl}
               
                alt="Browser Screenshot"
                className="  border-2 w-full border-white rounded-2xl"
                loading="lazy"
              />
            </div>
          )}
          <div className="whitespace-pre-wrap max-w-1/2 p-12 text-xl">{data}</div>
        </div>
      )}
    </div>
  );
};

export default Page;
