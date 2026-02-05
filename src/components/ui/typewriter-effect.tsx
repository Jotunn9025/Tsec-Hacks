"use client";
import { useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface TypewriterEffectProps {
    text: string;
    className?: string;
    cursorClassName?: string;
    delay?: number;
}

export const TypewriterEffect = ({
    text,
    className,
    cursorClassName,
    delay = 0,
}: TypewriterEffectProps) => {
    const [displayedText, setDisplayedText] = useState("");
    const [started, setStarted] = useState(false);

    // Start typing after delay
    useEffect(() => {
        const timeout = setTimeout(() => {
            setStarted(true);
        }, delay * 1000); // delay is in seconds
        return () => clearTimeout(timeout);
    }, [delay]);

    // Typing logic
    useEffect(() => {
        if (!started) return;

        if (displayedText.length < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + 1));
            }, 50); // Typing speed
            return () => clearTimeout(timeout);
        }
    }, [started, displayedText, text]);

    return (
        <div
            className={cn(
                "inline-block tracking-wide mb-4 whitespace-pre-wrap",
                className
            )}
        >
            <motion.span>
                {displayedText}
            </motion.span>
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
                className={cn(
                    "inline-block rounded-sm w-[4px] h-[1.2em] bg-primary ml-1 align-middle mb-1",
                    cursorClassName
                )}
            ></motion.span>
        </div>
    );
};
