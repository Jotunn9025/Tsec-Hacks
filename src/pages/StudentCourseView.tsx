import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, CourseWithLectures, formatUrl } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { LectureList } from '@/components/LectureList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const StudentCourseView = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<CourseWithLectures | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourse = async () => {
            if (!courseId) return;

            try {
                const data = await api.getStudentCourse(parseInt(courseId));
                setCourse(data);
            } catch (error) {
                console.error('Failed to fetch course:', error);
                toast.error('Failed to load course details');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId]);

    const handlePlayLecture = (lectureId: number) => {
        navigate(`/student/lecture/${lectureId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container py-20 text-center">
                    <p className="text-muted-foreground">Loading course...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container py-20 text-center">
                    <p className="text-muted-foreground">Course not found</p>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/student/courses')}
                        className="mt-4"
                    >
                        Back to Courses
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <section className="container py-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/student/courses')}
                    className="mb-6 gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Courses
                </Button>

                {/* Course Header */}
                <Card className="mb-8">
                    <div className="relative aspect-[21/9] bg-gradient-to-br from-primary/20 to-secondary/20">
                        {course.image_url ? (
                            <img
                                src={formatUrl(course.image_url)}
                                alt={course.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-24 w-24 text-primary/40" />
                            </div>
                        )}
                    </div>

                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
                                <CardDescription className="text-base">
                                    {course.description}
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-lg px-4 py-2">
                                {course.lectures.length} Lectures
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* Lectures List */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">Course Lectures</h2>
                    {course.lectures.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">No lectures available in this course yet.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <LectureList
                            lectures={course.lectures}
                            onPlay={handlePlayLecture}
                            variant="student"
                        />
                    )}
                </div>
            </section>
        </div>
    );
};

export default StudentCourseView;
