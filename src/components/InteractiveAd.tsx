import { useState, useEffect } from 'react';
import { X, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export const InteractiveAd = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Show ad after a short delay
    const timer = setTimeout(() => setIsVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, rotate: -2 }}
        animate={{ y: 0, opacity: 1, rotate: isHovered ? 0 : -2 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-6 left-6 z-50 max-w-sm w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative group">
          {/* Glowing background effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-xy"></div>

          <div className="relative p-6 bg-slate-900 rounded-xl leading-none flex items-center space-x-6 border border-slate-700 shadow-2xl overflow-hidden">
            {/* Background geometric shapes */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-gradient-to-tr from-orange-500/20 to-transparent rounded-full blur-xl"></div>

            <div className="flex-1 z-10">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-orange-500 rounded-full animate-pulse-slow">
                  LIMITED OFFER
                </span>
                <span className="flex items-center text-xs font-medium text-slate-300">
                  <Zap className="w-3 h-3 text-yellow-400 mr-1 fill-yellow-400" />
                  Selling Fast
                </span>
              </div>

              <h3 className="text-white font-bold text-lg mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-600 transition-all duration-300">
                Unlock Pro Access
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Get <span className="text-white font-bold text-shadow-sm">50% OFF</span> your first course bundle. Level up today!
              </p>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold transform group-hover:scale-105 transition-transform duration-200"
                >
                  Claim Discount
                </Button>
                <div className="text-xs text-slate-500 flex items-center group-hover:translate-x-1 transition-transform">
                  Learn more <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
