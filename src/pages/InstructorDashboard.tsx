import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Course } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { CourseCard } from '@/components/CourseCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MovingBorderCard } from '@/components/ui/moving-border';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

const InstructorDashboard = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const coursesData = await api.getInstructorCourses();
                setCourses(coursesData);
            } catch (error) {
                console.error('Failed to fetch instructor data:', error);
                // Silently fail - show empty state
                setCourses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleDeleteCourse = async (courseId: number) => {
        if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }

        try {
            await api.deleteCourse(courseId);
            setCourses(courses.filter(c => c.id !== courseId));
            toast.success('Course deleted successfully');
        } catch (error) {
            console.error('Failed to delete course:', error);
            toast.error('Failed to delete course');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative py-12 overflow-hidden bg-slate-900 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-background/5" />
                <div className="container relative z-10">
                    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Badge variant="secondary" className="gap-2 mb-4 bg-white/10 text-white hover:bg-white/20 border-none">
                            <GraduationCap className="h-4 w-4" />
                            Instructor Dashboard
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                            Manage Your Courses
                        </h1>
                        <p className="text-lg text-slate-300">
                            Create, edit, and track your educational content
                        </p>
                    </div>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="container py-8 -mt-8 relative z-20">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <MovingBorderCard
                        containerClassName="animate-in fade-in zoom-in-95 duration-500 delay-100 mt-4"
                        className="shadow-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all duration-300 border-none bg-card backdrop-blur-sm"
                        borderRadius="0.75rem"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Courses</CardTitle>
                            <div className="p-2 bg-blue-100 rounded-full">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">{courses.length}</div>
                            <p className="text-xs text-slate-500 mt-1">
                                Courses you've created
                            </p>
                        </CardContent>
                    </MovingBorderCard>

                    <MovingBorderCard
                        containerClassName="md:col-span-2 animate-in fade-in zoom-in-95 duration-500 delay-200 mt-4"
                        className="shadow-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all duration-300 border-none bg-card backdrop-blur-sm"
                        borderRadius="0.75rem"
                    >
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-slate-900">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex gap-3">
                            <Button onClick={() => navigate('/instructor/courses/new')} className="gap-2 shadow-md hover:shadow-lg transition-all">
                                <Plus className="h-4 w-4" />
                                Create New Course
                            </Button>
                        </CardContent>
                    </MovingBorderCard>
                </div>
            </section>

            {/* Courses Section */}
            <section className="container pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Your Courses</h2>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">Loading courses...</p>
                    </div>
                ) : courses.length === 0 ? (
                    <MovingBorderCard className="border-2 border-dashed border-none bg-card" containerClassName="mx-auto max-w-lg">
                        <CardContent className="py-12 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 rounded-full bg-primary/10">
                                    <BookOpen className="h-12 w-12 text-primary" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-2">No Courses Yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Get started by creating your first course
                            </p>
                            <Button onClick={() => navigate('/instructor/courses/new')} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create Your First Course
                            </Button>
                        </CardContent>
                    </MovingBorderCard>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                variant="instructor"
                                onView={(courseId) => navigate(`/instructor/courses/${courseId}`)}
                                onEdit={(courseId) => navigate(`/instructor/courses/${courseId}/edit`)}
                                onDelete={handleDeleteCourse}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default InstructorDashboard;
