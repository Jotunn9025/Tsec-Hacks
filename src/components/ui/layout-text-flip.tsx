"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const LayoutTextFlip = ({
    text,
    words,
    duration = 3000,
    className,
}: {
    text: string;
    words: string[];
    duration?: number;
    className?: string;
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
        }, duration);

        return () => clearInterval(interval);
    }, [duration, words.length]);

    return (
        <div className={cn("inline-flex items-center justify-center gap-2", className)}>
            <motion.span
                layoutId="subtext"
                className="text-4xl md:text-6xl font-bold tracking-tight text-foreground"
            >
                {text}
            </motion.span>

            <div className="relative inline-flex h-[1.2em] overflow-hidden bg-primary text-primary-foreground px-4 rounded-lg items-center">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={currentIndex}
                        initial={{ y: "100%", opacity: 0, filter: "blur(10px)" }}
                        animate={{
                            y: 0,
                            opacity: 1,
                            filter: "blur(0px)",
                        }}
                        exit={{ y: "-100%", opacity: 0, filter: "blur(10px)" }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                        }}
                        className="inline-block whitespace-nowrap text-4xl md:text-6xl font-bold tracking-tight"
                    >
                        {words[currentIndex]}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
};
