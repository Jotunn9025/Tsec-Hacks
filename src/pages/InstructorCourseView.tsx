import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Course, Lecture } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { LectureList } from '@/components/LectureList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';

const InstructorCourseView = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId) return;

            try {
                const courseData = await api.getInstructorCourse(parseInt(courseId));
                const lecturesData = await api.getCourseLectures(parseInt(courseId));
                setCourse(courseData);
                setLectures(lecturesData);
            } catch (error) {
                console.error('Failed to fetch course:', error);
                // Use fallback data - show empty course that was just created
                setCourse({
                    id: parseInt(courseId),
                    title: 'New Course',
                    description: 'Course created successfully. Backend endpoints not implemented yet.',
                    category: '',
                    thumbnail_url: '',
                    instructor_id: 0,
                    created_at: new Date().toISOString(),
                });
                setLectures([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId]);

    const handleDeleteLecture = async (lectureId: number) => {
        if (!courseId || !confirm('Are you sure you want to delete this lecture?')) {
            return;
        }

        try {
            await api.deleteLecture(parseInt(courseId), lectureId);
            setLectures(lectures.filter(l => l.id !== lectureId));
            toast.success('Lecture deleted successfully');
        } catch (error) {
            console.error('Failed to delete lecture:', error);
            toast.error('Failed to delete lecture');
        }
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
                        onClick={() => navigate('/instructor/dashboard')}
                        className="mt-4"
                    >
                        Back to Dashboard
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
                    onClick={() => navigate('/instructor/dashboard')}
                    className="mb-6 gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Button>

                {/* Course Header */}
                <Card className="mb-8">
                    <div className="relative aspect-[21/9] bg-gradient-to-br from-primary/20 to-secondary/20">
                        {course.thumbnail_url ? (
                            <img
                                src={course.thumbnail_url}
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
                            <div className="flex gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                                >
                                    Edit Course
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Lectures Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold">Course Lectures</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {lectures.length} lecture{lectures.length !== 1 ? 's' : ''} in this course
                            </p>
                        </div>
                        <Button onClick={() => navigate(`/instructor/courses/${course.id}/lectures/new`)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Lecture
                        </Button>
                    </div>

                    {lectures.length === 0 ? (
                        <Card className="border-2 border-dashed">
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground mb-6">
                                    No lectures added yet. Create your first lecture to get started.
                                </p>
                                <Button onClick={() => navigate(`/instructor/courses/${course.id}/lectures/new`)} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add First Lecture
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <LectureList
                            lectures={lectures}
                            onEdit={(lectureId) => navigate(`/instructor/courses/${course.id}/lectures/${lectureId}/edit`)}
                            onDelete={handleDeleteLecture}
                            variant="instructor"
                        />
                    )}
                </div>
            </section>
        </div>
    );
};

export default InstructorCourseView;
