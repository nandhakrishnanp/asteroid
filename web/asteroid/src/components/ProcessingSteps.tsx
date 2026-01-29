"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface Step {
  id: string;
  name: string;
  completed: boolean;
  current: boolean;
  timestamp?: Date;
}

interface ProcessingStepsProps {
  steps: Step[];
  startTime: Date;
}

export default function ProcessingSteps({
  steps,
  startTime,
}: ProcessingStepsProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-20 right-6 z-40 w-80 max-h-96 overflow-y-auto"
    >
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-lg p-4 space-y-3">
        {/* Header with Timer */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-semibold text-white">Processing</h3>
            <p className="text-xs text-gray-400 mt-1">
              {completedCount} of {totalSteps} steps
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-white/60" />
            <span className="text-sm font-mono text-white">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-gradient-to-r from-white/40 to-white/60 rounded-full"
          />
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                step.completed
                  ? "bg-white/5"
                  : step.current
                    ? "bg-white/10 border border-white/20"
                    : "bg-transparent"
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {step.completed ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-white/60" />
                  </motion.div>
                ) : step.current ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Circle className="w-4 h-4 text-white/80 fill-white/20" />
                  </motion.div>
                ) : (
                  <Circle className="w-4 h-4 text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium truncate ${
                    step.current
                      ? "text-white"
                      : step.completed
                        ? "text-white/60"
                        : "text-white/40"
                  }`}
                >
                  {step.name}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-white/30 mt-0.5">
                    {step.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
