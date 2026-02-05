import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Video } from './VideoCard';
import { AlertCircle, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface VideoPlayerProps {
  video: Video | null;
  onClose: () => void;
}

const INACTIVITY_THRESHOLD = 10000; // 10 seconds of no input
const BILLING_INTERVAL = 60000; // Bill every minute (60 seconds)

export const VideoPlayer = ({ video, onClose }: VideoPlayerProps) => {
  const { user, updateWallet } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [totalCharged, setTotalCharged] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const watchTimeRef = useRef(0);
  const billedTimeRef = useRef(0);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showInactivityModal) {
      setShowInactivityModal(false);
      setIsPlaying(true);
    }
  }, [showInactivityModal]);

  const checkInactivity = useCallback(() => {
    if (!isPlaying || !video) return;

    const timeSinceActivity = Date.now() - lastActivityRef.current;
    if (timeSinceActivity >= INACTIVITY_THRESHOLD) {
      setIsPlaying(false);
      setShowInactivityModal(true);
    }
  }, [isPlaying, video]);

  const billUser = useCallback(() => {
    if (!video || !user) return;

    const unbilledSeconds = watchTimeRef.current - billedTimeRef.current;
    const unbilledMinutes = unbilledSeconds / 60;

    if (unbilledMinutes > 0) {
      const charge = unbilledMinutes * video.pricePerMinute;
      if (user.wallet_balance >= charge) {
        updateWallet(-charge);
        setTotalCharged(prev => prev + charge);
        billedTimeRef.current = watchTimeRef.current;
      } else {
        setIsPlaying(false);
        toast.error('Insufficient balance! Please add funds to continue watching.');
      }
    }
  }, [video, user, updateWallet]);

  // Track watch time when playing
  useEffect(() => {
    if (isPlaying && video) {
      playIntervalRef.current = setInterval(() => {
        watchTimeRef.current += 1;
        setWatchTime(watchTimeRef.current);

        // Bill every minute
        if (watchTimeRef.current % 60 === 0) {
          billUser();
        }
      }, 1000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, video, billUser]);

  // Check for inactivity
  useEffect(() => {
    if (isPlaying) {
      inactivityCheckRef.current = setInterval(checkInactivity, 1000);
    } else {
      if (inactivityCheckRef.current) {
        clearInterval(inactivityCheckRef.current);
      }
    }

    return () => {
      if (inactivityCheckRef.current) {
        clearInterval(inactivityCheckRef.current);
      }
    };
  }, [isPlaying, checkInactivity]);

  // Listen for user activity
  useEffect(() => {
    if (!video) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [video, handleActivity]);

  // Bill remaining time on close
  const handleClose = () => {
    billUser();
    setIsPlaying(false);
    setWatchTime(0);
    setTotalCharged(0);
    watchTimeRef.current = 0;
    billedTimeRef.current = 0;
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!video) return null;

  const progress = (watchTime / (video.duration * 60)) * 100;

  return (
    <>
      <Dialog open={!!video} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative aspect-video bg-black">
            {/* Simulated video player */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                {isPlaying ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-pulse">
                      <Play className="h-20 w-20 fill-white" />
                    </div>
                    <p className="text-lg">Playing: {video.title}</p>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => setIsPlaying(true)}
                    className="gap-2"
                  >
                    <Play className="h-6 w-6 fill-current" />
                    Start Watching
                  </Button>
                )}
              </div>
            </div>

            {/* Video controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <Progress value={progress} className="h-1 mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <span className="text-white text-sm">
                    {formatTime(watchTime)} / {formatTime(video.duration * 60)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-white text-sm">
                  <span>Charged: ₹{totalCharged.toFixed(2)}</span>
                  <span className="px-3 py-1 bg-primary rounded-full">
                    Balance: ₹{user?.wallet_balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <h2 className="text-xl font-bold">{video.title}</h2>
            <p className="text-muted-foreground mt-1">{video.description}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Instructor: {video.instructor} • Rate: ₹{video.pricePerMinute}/min watched
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inactivity Modal */}
      <Dialog open={showInactivityModal} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={handleActivity}>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                <AlertCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Are you still there?</DialogTitle>
            <DialogDescription className="text-center">
              We noticed you've been inactive. The video has been paused to save your wallet balance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={handleActivity} className="w-full" size="lg">
              Yes, I'm here! Resume watching
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
