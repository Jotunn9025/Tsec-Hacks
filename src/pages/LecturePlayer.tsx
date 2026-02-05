import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Lecture } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, AlertCircle, Info, Play, Pause, CirclePause, CirclePlay } from 'lucide-react';
import { toast } from 'sonner';

const INACTIVITY_THRESHOLD = 300000; // 5 minutes
const ACTIVITY_REPORT_INTERVAL = 1000; // Report activity every 1 second
const ESTIMATED_PROGRESS_INTERVAL = 1000; // Update estimated progress every second

const LecturePlayer = () => {
    const { lectureId } = useParams<{ lectureId: string }>();
    const navigate = useNavigate();
    const { user, updateWallet } = useAuth();

    const [lecture, setLecture] = useState<Lecture | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true); // Assume playing when iframe loads
    const [showInactivityModal, setShowInactivityModal] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(0); // Estimated playback position in seconds
    const [totalWatchTime, setTotalWatchTime] = useState(0); // Total watch time in seconds
    const [sessionStartTime, setSessionStartTime] = useState(Date.now());

    const lastActivityRef = useRef(Date.now());
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastReportedTimeRef = useRef(0); // Last time we reported watch activity
    const playStartTimeRef = useRef(Date.now());
    const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);
    const activityReportRef = useRef<NodeJS.Timeout | null>(null);
    const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to process video URLs (handle Google Drive)
    const processVideoUrl = (url: string) => {
        if (!url) return '';

        // Check for Google Drive links
        if (url.includes('drive.google.com')) {
            // Extract ID
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                // Use preview URL for iframe embedding
                return `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        }

        // For other video URLs, you might want to use iframe or video tag
        // For now, return as-is
        return url;
    };

    // Check if URL is Google Drive
    const isGoogleDriveUrl = (url: string) => {
        return url && url.includes('drive.google.com');
    };

    // Fetch lecture data
    useEffect(() => {
        const fetchLecture = async () => {
            if (!lectureId) return;

            try {
                const data = await api.getStudentLecture(parseInt(lectureId));
                setLecture(data.lecture);

                // Set initial watch time
                const startSeconds = (data.watch_time_minutes || 0) * 60;
                setEstimatedTime(startSeconds);
                setTotalWatchTime(startSeconds);
                lastReportedTimeRef.current = Date.now(); // Reset reporting base

                // If regular video, set currentTime when loaded
                if (videoRef.current && !isGoogleDriveUrl(data.lecture.video_url)) {
                    videoRef.current.currentTime = startSeconds;
                }

                toast.success('Lecture loaded! Resuming from where you left off...');
                setSessionStartTime(Date.now());
                setIsPlaying(true);
            } catch (error) {
                console.error('Failed to fetch lecture:', error);
                toast.error('Failed to load lecture');
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };

        fetchLecture();
    }, [lectureId, navigate]);

    // Handle user activity
    const handleActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        if (showInactivityModal) {
            setShowInactivityModal(false);
            setIsPlaying(true);
            playStartTimeRef.current = Date.now();
        }
    }, [showInactivityModal]);

    // Check for inactivity
    const checkInactivity = useCallback(() => {
        if (!isPlaying || !lecture) return;

        const timeSinceActivity = Date.now() - lastActivityRef.current;
        if (timeSinceActivity >= INACTIVITY_THRESHOLD) {
            setIsPlaying(false);
            setShowInactivityModal(true);
            toast.warning('Video paused due to inactivity');
        }
    }, [isPlaying, lecture]);

    // Report watch activity to backend
    const reportWatchActivity = useCallback(async (isCompleted: boolean = false, isExit: boolean = false) => {
        if (!lecture) return; // Allow reporting even if paused (for exit), but need lecture

        const currentTime = Date.now();
        // Calculate seconds watched since last report
        const watchedSeconds = (currentTime - lastReportedTimeRef.current) / 1000;

        // If exiting or completed, we might report smaller increments
        // Update: Removed buffer to support 1-second dynamic updates
        if (!isExit && !isCompleted && watchedSeconds < 0.5) return; // Tiny buffer just to avoid noise, but basically 0

        const incrementMinutes = watchedSeconds / 60;

        // Optimistically update tracking to ensure real-time accuracy regardless of API latency
        lastReportedTimeRef.current = currentTime;
        setTotalWatchTime(prev => prev + watchedSeconds);

        // Deduct money from local wallet state immediately
        if (incrementMinutes > 0 && lecture.price_per_10_mins > 0) {
            const pricePerMinute = lecture.price_per_10_mins / 10;
            const deduction = incrementMinutes * pricePerMinute;
            updateWallet(-deduction);
        }

        try {
            const response = await api.postWatchActivity({
                lecture_id: lecture.id,
                watch_time_increment_minutes: incrementMinutes,
                completed: isCompleted,
                is_exit: isExit
            });

            console.log(`Reported ${incrementMinutes.toFixed(4)} mins. Locked: ${response.amount_locked_for_lecture}, Spent: ${response.amount_spent_for_lecture}`);
        } catch (error) {
            console.error('Failed to report watch activity:', error);
            // Don't toast on exit to avoid UI clutter
            if (!isExit) toast.error('Failed to save progress');
        }
    }, [lecture, updateWallet]);

    // Estimated progress timer (since we can't track iframe video directly)
    useEffect(() => {
        if (isPlaying) {
            progressTimerRef.current = setInterval(() => {
                setEstimatedTime(prev => {
                    const maxTime = lecture ? lecture.duration : 0;
                    return Math.min(prev + 1, maxTime);
                });
            }, ESTIMATED_PROGRESS_INTERVAL);
        } else {
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
            }
        }

        return () => {
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
            }
        };
    }, [isPlaying, lecture]);

    // Periodic activity reporting
    useEffect(() => {
        if (isPlaying && lecture) {
            // Set initial report time
            if (lastReportedTimeRef.current === 0) {
                lastReportedTimeRef.current = Date.now();
            }

            activityReportRef.current = setInterval(() => {
                reportWatchActivity(false);
            }, ACTIVITY_REPORT_INTERVAL);
        } else {
            if (activityReportRef.current) {
                clearInterval(activityReportRef.current);
            }
        }

        // Save to local storage for "Continue Learning"
        if (lecture) {
            localStorage.setItem('lastWatched', JSON.stringify({
                courseId: lecture.course_id,
                lectureId: lecture.id,
                title: lecture.title,
                timestamp: Date.now()
            }));
        }

        return () => {
            if (activityReportRef.current) {
                clearInterval(activityReportRef.current);
            }
        };
    }, [isPlaying, lecture, reportWatchActivity]);

    // Listen for user activity for inactivity detection
    useEffect(() => {
        if (!lecture) return;

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [lecture, handleActivity]);

    // Check for inactivity periodically
    useEffect(() => {
        if (isPlaying) {
            inactivityCheckRef.current = setInterval(checkInactivity, 5000);
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Report final watch activity before leaving
            if (lecture) {
                reportWatchActivity(false, true);
            }
        };
    }, []);

    // Handle close
    const handleClose = () => {
        reportWatchActivity(false, true); // Save final progress with exit flag
        navigate(-1);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <p className="text-white">Loading lecture...</p>
            </div>
        );
    }

    if (!lecture) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-white mb-4">Lecture not found</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    const progress = lecture.duration > 0 ? (estimatedTime / lecture.duration) * 100 : 0;
    const isGoogleDrive = isGoogleDriveUrl(lecture.video_url);

    return (
        <div className="min-h-screen bg-black">
            {/* Video Player */}
            <div className="relative w-full h-screen flex flex-col">
                {/* Back Button */}
                <div className="absolute top-4 left-4 z-50">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleClose}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>

                {/* Video Element */}
                <div className="flex-1 flex items-center justify-center bg-black">
                    {isGoogleDrive ? (
                        <iframe
                            src={processVideoUrl(lecture.video_url)}
                            className="w-full h-full"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            style={{ border: 'none' }}
                            onLoad={() => {
                                console.log('Video iframe loaded');
                                toast.success('Video loaded successfully!');
                            }}
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={lecture.video_url}
                            className="max-w-full max-h-full"
                            controls
                            autoPlay
                            onTimeUpdate={(e) => {
                                const video = e.currentTarget;
                                setEstimatedTime(video.currentTime);
                            }}
                            onPlay={() => {
                                setIsPlaying(true);
                                playStartTimeRef.current = Date.now();
                            }}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => {
                                setIsPlaying(false);
                                reportWatchActivity(true);
                                toast.success('Lecture completed!');
                            }}
                            onError={(e) => {
                                console.error('Video error:', e);
                                toast.error('Video failed to load. Please check the video URL.');
                            }}
                        />
                    )}
                </div>

                {/* Video Info Bar (for Google Drive iframe) */}
                {isGoogleDrive && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent p-6">
                        <Progress value={progress} className="h-1.5 mb-4" />

                        <div className="flex items-center justify-between text-white mb-3">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">
                                    Estimated: {formatTime(estimatedTime)} / {formatTime(lecture.duration)}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <Info className="h-4 w-4" />
                                    <span>Video controls in player above</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm">
                                    Session time: {formatTime(totalWatchTime)}
                                </span>
                                <span className="text-sm bg-primary px-3 py-1 rounded-full">
                                    ₹{lecture.price_per_10_mins}/10 min
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mb-4 bg-white/10 p-3 rounded-lg border border-white/10">
                            <Button
                                variant={isPlaying ? "destructive" : "default"}
                                size="sm"
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="gap-2 shrink-0"
                            >
                                {isPlaying ? (
                                    <>
                                        <CirclePause className="h-4 w-4" />
                                        Pause Tracking
                                    </>
                                ) : (
                                    <>
                                        <CirclePlay className="h-4 w-4" />
                                        Resume Tracking
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-white/80">
                                <strong>Note:</strong> Since this is an external video, we can't detect when you pause it.
                                Please click "Pause Tracking" manually if you stop watching to avoid being billed.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-white">{lecture.title}</h2>
                            <p className="text-sm text-white/70 mt-1">{lecture.description}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Inactivity Modal */}
            <Dialog open={showInactivityModal} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md">
                    <div className="text-center py-6">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 rounded-full bg-primary/10">
                                <AlertCircle className="h-12 w-12 text-primary" />
                            </div>
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold mb-2 text-center">Are you still there?</DialogTitle>
                            <DialogDescription className="text-muted-foreground mb-6 text-center">
                                We noticed you haven't interacted for 5 minutes. Activity tracking has been paused to save your balance.
                            </DialogDescription>
                        </DialogHeader>
                        <Button onClick={handleActivity} size="lg" className="w-full">
                            Yes, I'm here! Resume tracking
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LecturePlayer;
