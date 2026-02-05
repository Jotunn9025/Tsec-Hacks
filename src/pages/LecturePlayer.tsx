import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, paymentApi, Lecture, formatUrl, ChunkActivity } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, CirclePause, CirclePlay, Star, CheckCircle2, MessageSquare, ChevronDown, ChevronUp, List } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LectureReview as LectureReviewType } from '@/lib/api';
import { format } from 'date-fns';

const LecturePlayer = () => {
    const { lectureId } = useParams<{ lectureId: string }>();
    const navigate = useNavigate();
    const { user, updateWallet } = useAuth();

    const [lecture, setLecture] = useState<Lecture | null>(null);
    const [allLectures, setAllLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [spentAmount, setSpentAmount] = useState(0);
    const [sessionSpent, setSessionSpent] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [chunks, setChunks] = useState<ChunkActivity[]>([]);
    const [videoDuration, setVideoDuration] = useState(0);

    // Review System State
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [lectureReviews, setLectureReviews] = useState<LectureReviewType[]>([]);
    const [showReviews, setShowReviews] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const lastReportedChunkIndexRef = useRef<number | null>(null);
    const savingPositionRef = useRef(false);

    // Helpers
    const processVideoUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
        return formatUrl(url);
    };

    const isGoogleDriveUrl = (url: string) => url && url.includes('drive.google.com');

    const handleClose = async () => {
        try {
            if (videoRef.current && lecture && user) {
                await api.reportChunkVisit(lecture.id, videoRef.current.currentTime);

                if (sessionStartTime) {
                    const durationMinutes = (Date.now() - sessionStartTime) / 60000;
                    await paymentApi.endSession(user.id, lecture.course_id, durationMinutes);
                }
            }
        } catch (err) {
            console.error("Failed to sync progress on exit:", err);
        } finally {
            if (sessionSpent > 0) {
                toast.success(`Session ended`, {
                    description: `You spent ₹${sessionSpent.toFixed(2)} this session.`
                });
            }
            navigate(`/student/courses/${lecture?.course_id}`);
        }
    };

    const handleSubmitReview = async () => {
        if (!lecture || !user) return;
        setIsSubmittingReview(true);
        try {
            await api.postLectureReview(lecture.id, rating, reviewText);
            toast.success("Thank you for your feedback!");
            setIsReviewOpen(false);
            await handleClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to submit review");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const fetchLecture = useCallback(async (isResume: boolean = false) => {
        if (!lectureId || !user) return;
        if (isResume) setIsTransitioning(true);

        try {
            const lid = parseInt(lectureId);
            const data = await api.getStudentLecture(lid);
            setLecture(data.lecture);

            const courseData = await api.getStudentCourse(data.lecture.course_id);
            setAllLectures(courseData.lectures);

            const chunkData = await api.getLectureChunks(lid);
            setChunks(chunkData.chunks);

            // Fetch Reviews
            try {
                const reviews = await api.getLectureReviews(lid);
                setLectureReviews(reviews);
            } catch (err) {
                console.error("Failed to fetch reviews:", err);
            }

            setEstimatedTime(data.watch_time_seconds);
            setSpentAmount(data.amount_spent_for_lecture);
            setSessionSpent(0);

            // External Session Start
            try {
                await paymentApi.startSession(user.id, data.lecture.course_id);
                setSessionStartTime(Date.now());
                if (!isResume) toast.success('Session started! Happy learning.');
            } catch (err: any) {
                console.error('Failed to start billing session:', err);
                toast.error(err.message || 'Insufficient wallet balance');
                navigate(-1);
                return;
            }

            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch lecture:', error);
            toast.error('Failed to load lecture');
            navigate(-1);
        } finally {
            setIsTransitioning(false);
        }
    }, [lectureId, navigate, user]);

    useEffect(() => {
        fetchLecture();
    }, [fetchLecture]);

    const reportProgress = useCallback(async () => {
        if (!lecture || !videoRef.current || savingPositionRef.current) return;

        const currTime = videoRef.current.currentTime;
        const currentChunk = chunks.find(c => currTime >= c.start_time && currTime < c.end_time);

        if (currentChunk && currentChunk.index !== lastReportedChunkIndexRef.current) {
            lastReportedChunkIndexRef.current = currentChunk.index;
            try {
                const res = await api.reportChunkVisit(lecture.id, currTime);
                if (res.charged) {
                    setSpentAmount(prev => prev + res.charge_amount);
                    setSessionSpent(prev => prev + res.charge_amount);
                    updateWallet(-res.charge_amount);

                    if (res.recharge) {
                        toast.error(`Revisit limit exceeded! Chunk ${res.chunk_index + 1} re-charged (₹${res.charge_amount.toFixed(2)})`);
                    } else {
                        toast.success(`Chunk ${res.chunk_index + 1} unlocked (₹${res.charge_amount.toFixed(2)})`);
                    }
                }
                setChunks(prev => prev.map(c => c.index === res.chunk_index ? { ...c, visit_count: res.visit_count } : c));
            } catch (err) {
                console.error("Failed to report progress:", err);
            }
        } else {
            savingPositionRef.current = true;
            api.reportChunkVisit(lecture.id, currTime).finally(() => {
                savingPositionRef.current = false;
            });
        }
    }, [lecture, chunks, updateWallet]);

    useEffect(() => {
        if (isPlaying && lecture) {
            const interval = setInterval(reportProgress, 5000);
            return () => clearInterval(interval);
        }
    }, [isPlaying, lecture, reportProgress]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch(e => console.error("Auto-play blocked:", e));
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying]);

    const handlePause = async () => {
        setIsPlaying(false);
        if (videoRef.current && lecture) {
            await api.reportChunkVisit(lecture.id, videoRef.current.currentTime);
        }
    };

    const handleSliderSeek = (values: number[]) => {
        if (videoRef.current && lecture) {
            const newTime = values[0];
            videoRef.current.currentTime = newTime;
            setEstimatedTime(newTime);

            const currentChunk = chunks.find(c => newTime >= c.start_time && newTime < c.end_time);
            if (currentChunk && currentChunk.index !== lastReportedChunkIndexRef.current) {
                lastReportedChunkIndexRef.current = currentChunk.index;
                api.reportChunkVisit(lecture.id, newTime).then(res => {
                    if (res.charged) {
                        setSpentAmount(prev => prev + res.charge_amount);
                        setSessionSpent(prev => prev + res.charge_amount);
                        updateWallet(-res.charge_amount);
                        if (res.recharge) toast.error(`Revisit limit exceeded! Chunk ${res.chunk_index + 1} re-charged`);
                        else toast.success(`Chunk ${res.chunk_index + 1} unlocked`);
                    }
                    setChunks(prev => prev.map(c => c.index === res.chunk_index ? { ...c, visit_count: res.visit_count } : c));
                });
            }
        }
    };

    const handleNextPrev = (direction: 'next' | 'prev') => {
        if (!lecture || !user) return;
        const currentIndex = allLectures.findIndex(l => l.id === lecture.id);
        const nextLecture = direction === 'next' ? allLectures[currentIndex + 1] : allLectures[currentIndex - 1];

        if (nextLecture) {
            const syncProgress = async () => {
                try {
                    if (videoRef.current) await api.reportChunkVisit(lecture.id, videoRef.current.currentTime);
                    if (sessionStartTime) {
                        const durationMinutes = (Date.now() - sessionStartTime) / 60000;
                        await paymentApi.endSession(user.id, lecture.course_id, durationMinutes);
                    }
                } catch (err) {
                    console.error("Failed to sync progress on switch:", err);
                } finally {
                    navigate(`/lecture/${nextLecture.id}`);
                }
            };
            syncProgress();
        } else {
            toast.info(direction === 'next' ? 'End of course' : 'First lecture');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    if (!lecture) return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Button onClick={() => navigate(-1)}>Go Back</Button></div>;

    return (
        <div className="min-h-screen bg-black">
            <div className="relative w-full h-screen flex flex-col">
                <div className="absolute top-4 left-4 z-50 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleClose} className="gap-2 bg-black/50 hover:bg-black/70 text-white border-white/10 backdrop-blur-md transition-all hover:pl-4">
                        <ArrowLeft className="h-4 w-4" /> Back to Course
                    </Button>
                </div>

                <div className="absolute top-4 right-4 z-50 flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="gap-2 bg-black/50 hover:bg-black/70 text-white border-white/10 backdrop-blur-md"
                    >
                        <List className="h-4 w-4" />
                        {isSidebarOpen ? 'Hide' : 'Lectures'}
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                            setIsPlaying(false);
                            setIsReviewOpen(true);
                        }}
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white border-none shadow-lg animate-pulse-slow"
                    >
                        <CheckCircle2 className="h-4 w-4" /> Complete
                    </Button>
                </div>

                <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
                    {isGoogleDriveUrl(lecture.video_url) ? (
                        <iframe src={processVideoUrl(lecture.video_url)} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen style={{ border: 'none' }} />
                    ) : (
                        <div className="relative w-full h-full group">
                            <video
                                ref={videoRef}
                                src={formatUrl(lecture.video_url)}
                                className="w-full h-full"
                                autoPlay
                                onLoadedMetadata={(e) => {
                                    setVideoDuration(e.currentTarget.duration);
                                    if (estimatedTime > 0) e.currentTarget.currentTime = estimatedTime;
                                }}
                                onTimeUpdate={(e) => setEstimatedTime(e.currentTarget.currentTime)}
                                onClick={() => setIsPlaying(!isPlaying)}
                                onPlay={() => {
                                    if (!isPlaying) fetchLecture(true);
                                    setIsPlaying(true);
                                }}
                                onPause={handlePause}
                            />

                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="text-xs font-mono text-white/80 tabular-nums">{formatTime(estimatedTime)} / {formatTime(videoDuration || lecture.duration)}</span>
                                    <Slider value={[estimatedTime]} max={videoDuration || lecture.duration || 100} step={0.1} onValueChange={handleSliderSeek} className="flex-1" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Button variant="ghost" size="sm" onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:bg-white/10 px-2">
                                            {isPlaying ? <CirclePause className="h-5 w-5" /> : <CirclePlay className="h-5 w-5" />}
                                        </Button>
                                        <h2 className="text-sm font-medium text-white/60">{lecture.title}</h2>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-mono text-white/30">
                                        <span>₹{spentAmount.toFixed(2)} total</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Below Player */}
            <div className="max-w-5xl mx-auto px-6 py-12 pb-32">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{lecture.title}</h1>
                        <p className="text-white/60 text-lg flex items-center gap-2">
                            Course: {allLectures[0]?.title || '...'}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => setShowReviews(!showReviews)}
                        className="text-white/40 hover:text-white gap-2"
                    >
                        <MessageSquare className="h-5 w-5" />
                        {lectureReviews.length} Reviews
                        {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>

                {showReviews && (
                    <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-8 transition-all duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                Ratings & Reviews
                                <span className="text-sm font-normal text-white/30 ml-2">({lectureReviews.length})</span>
                            </h3>
                            {lectureReviews.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-lg font-bold text-white">
                                        {(lectureReviews.reduce((acc, r) => acc + r.rating, 0) / lectureReviews.length).toFixed(1)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <ScrollArea className="h-fit max-h-[600px] pr-4">
                            <div className="space-y-6">
                                {lectureReviews.length > 0 ? (
                                    lectureReviews.map((review) => (
                                        <div key={review.id} className="space-y-3 p-4 rounded-xl hover:bg-white/5 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                className={`h-3 w-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-medium text-white/40">• Student {review.student_id}</span>
                                                </div>
                                                <span className="text-xs text-white/20 font-mono">
                                                    {format(new Date(review.created_at), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed italic">
                                                "{review.review || 'No written review provided.'}"
                                            </p>
                                            <Separator className="bg-white/5" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <MessageSquare className="h-12 w-12 text-white/10 mx-auto mb-4" />
                                        <p className="text-white/40">No reviews yet. Be the first to share your thoughts!</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Complete Session</DialogTitle>
                        <DialogDescription>
                            How was your experience with "{lecture.title}"?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Rating</span>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`h-8 w-8 ${star <= rating
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-muted-foreground/30"
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Detailed Review</span>
                            <Textarea
                                placeholder="What did you learn? Any feedback for the instructor?"
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsReviewOpen(false);
                                handleClose();
                            }}
                            disabled={isSubmittingReview}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Skip & Complete
                        </Button>
                        <Button
                            onClick={handleSubmitReview}
                            disabled={isSubmittingReview}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSubmittingReview ? "Submitting..." : "Submit & Complete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LecturePlayer;
