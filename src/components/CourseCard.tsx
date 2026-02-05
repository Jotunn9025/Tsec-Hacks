import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MovingBorderCard } from '@/components/ui/moving-border';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, Course, formatUrl } from '@/lib/api';
import { BookOpen, Clock, Play, Star } from 'lucide-react';

interface CourseCardProps {
    course: Course & { lecture_count?: number };
    variant?: 'student' | 'instructor';
    onView?: (courseId: number) => void;
    onEdit?: (courseId: number) => void;
    onDelete?: (courseId: number) => void;
}

export const CourseCard = ({ course, variant = 'student', onView, onEdit, onDelete }: CourseCardProps) => {
    return (
        <MovingBorderCard
            className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-none bg-card"
            containerClassName="hover:shadow-xl transition-all duration-300"
        >
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
                {course.image_url ? (
                    <img
                        src={formatUrl(course.image_url)}
                        alt={course.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-primary/40" />
                    </div>
                )}
            </div>

            <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-1">
                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                    {course.lecture_count !== undefined && (
                        <Badge variant="secondary" className="gap-1 shrink-0">
                            <Play className="h-3 w-3" />
                            {course.lecture_count}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold">
                            {course.average_rating?.toFixed(1) || '0.0'}
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        ({course.review_count || 0} reviews)
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {course.category}
                    </Badge>
                </div>

                <CardDescription className="line-clamp-2">{course.description}</CardDescription>
            </CardHeader>

            <CardFooter className="flex gap-2">
                {variant === 'student' && onView && (
                    <Button onClick={() => onView(course.id)} className="w-full gap-2">
                        <Play className="h-4 w-4" />
                        View Course
                    </Button>
                )}

                {variant === 'instructor' && (
                    <>
                        {onView && (
                            <Button onClick={() => onView(course.id)} variant="outline" className="flex-1">
                                View
                            </Button>
                        )}
                        {onEdit && (
                            <Button onClick={() => onEdit(course.id)} variant="outline" className="flex-1">
                                Edit
                            </Button>
                        )}
                        {onDelete && (
                            <Button onClick={() => onDelete(course.id)} variant="destructive" className="flex-1">
                                Delete
                            </Button>
                        )}
                    </>
                )}
            </CardFooter>
        </MovingBorderCard>
    );
};
