import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Course } from '@/lib/api';
import { BookOpen, Clock, Play } from 'lucide-react';

interface CourseCardProps {
    course: Course & { lecture_count?: number };
    variant?: 'student' | 'instructor';
    onView?: (courseId: number) => void;
    onEdit?: (courseId: number) => void;
    onDelete?: (courseId: number) => void;
}

export const CourseCard = ({ course, variant = 'student', onView, onEdit, onDelete }: CourseCardProps) => {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
                {course.image_url ? (
                    <img
                        src={course.image_url}
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
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                    {course.lecture_count !== undefined && (
                        <Badge variant="secondary" className="gap-1 shrink-0">
                            <Play className="h-3 w-3" />
                            {course.lecture_count}
                        </Badge>
                    )}
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
        </Card>
    );
};
