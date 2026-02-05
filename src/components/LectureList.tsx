import { LectureWithProgress } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, IndianRupee, Play, CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LectureListProps {
    lectures: LectureWithProgress[];
    onPlay?: (lectureId: number) => void;
    onEdit?: (lectureId: number) => void;
    onDelete?: (lectureId: number) => void;
    variant?: 'student' | 'instructor';
}

export const LectureList = ({ lectures, onPlay, onEdit, onDelete, variant = 'student' }: LectureListProps) => {
    if (lectures.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No lectures available yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {lectures.map((lecture, index) => (
                <Card key={lecture.id} className="hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="shrink-0">
                                        Lecture {index + 1}
                                    </Badge>
                                    {variant === 'student' && lecture.completed && (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    )}
                                </div>
                                <CardTitle className="text-lg line-clamp-1">{lecture.title}</CardTitle>
                                <CardDescription className="line-clamp-2 mt-1">
                                    {lecture.description}
                                </CardDescription>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{Math.round(lecture.duration / 60)} min</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                                    <IndianRupee className="h-3.5 w-3.5" />
                                    <span>{lecture.price_per_10_mins}/10 min</span>
                                </div>
                            </div>
                        </div>

                        {variant === 'student' && lecture.progress !== undefined && lecture.progress > 0 && (
                            <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{Math.round(lecture.progress)}%</span>
                                </div>
                                <Progress value={lecture.progress} className="h-1.5" />
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="pt-0">
                        <div className="flex gap-2">
                            {variant === 'student' && onPlay && (
                                <Button onClick={() => onPlay(lecture.id)} className="flex-1 gap-2">
                                    <Play className="h-4 w-4" />
                                    {lecture.progress && lecture.progress > 0 ? 'Continue' : 'Start'} Watching
                                </Button>
                            )}

                            {variant === 'instructor' && (
                                <>
                                    {onEdit && (
                                        <Button onClick={() => onEdit(lecture.id)} variant="outline" className="flex-1">
                                            Edit
                                        </Button>
                                    )}
                                    {onDelete && (
                                        <Button onClick={() => onDelete(lecture.id)} variant="destructive" className="flex-1">
                                            Delete
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
