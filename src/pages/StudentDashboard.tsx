import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, StudentDashboard as StudentDashboardData, Course } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, IndianRupee, Library, Play } from 'lucide-react';
import { toast } from 'sonner';

const StudentDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [lastWatched, setLastWatched] = useState<{ courseId: number; lectureId: number; title: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardData, coursesData] = await Promise.all([
                    api.getStudentDashboard(),
                    api.getStudentCourses()
                ]);
                setDashboard(dashboardData);
                setCourses(coursesData);

                // Load last watched
                const storedLastWatched = localStorage.getItem('lastWatched');
                if (storedLastWatched) {
                    setLastWatched(JSON.parse(storedLastWatched));
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                // Fallback
                if (user) {
                    setDashboard({
                        email: user.email,
                        name: user.name,
                        wallet_balance: user.wallet_balance || 0,
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container py-20 text-center">
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative py-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
                <div className="container relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="max-w-2xl">
                            <h1 className="text-4xl font-bold tracking-tight mb-2">
                                Welcome back, {dashboard?.name || user?.name}!
                            </h1>
                            <p className="text-xl text-muted-foreground">
                                Continue your learning journey
                            </p>
                        </div>

                        {lastWatched && (
                            <Card className="w-full md:w-auto min-w-[300px] border-primary/20 bg-background/50 backdrop-blur">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                                            Continue Watching
                                        </p>
                                        <p className="font-medium line-clamp-1">{lastWatched.title}</p>
                                    </div>
                                    <Button size="sm" onClick={() => navigate(`/student/lecture/${lastWatched.lectureId}`)}>
                                        <Play className="h-4 w-4 mr-2" />
                                        Resume
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="container py-8">
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{dashboard?.wallet_balance?.toFixed(2) || '0.00'}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Available for learning
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 w-full"
                                onClick={() => navigate('/wallet')}
                            >
                                Add Funds
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Courses Accessed</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboard?.total_courses_accessed || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Courses you're enrolled in
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Watch Time</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {dashboard?.total_watch_time_minutes ?
                                    `${Math.floor(dashboard.total_watch_time_minutes / 60)}h ${Math.round(dashboard.total_watch_time_minutes % 60)}m`
                                    : '0h 0m'
                                }
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Time spent learning
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Courses Section */}
            <section className="container pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Available Courses</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Explore and enroll in new courses
                        </p>
                    </div>
                </div>

                {courses.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {courses.map(course => (
                            <div key={course.id} className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
                                <div className="aspect-video w-full overflow-hidden bg-muted">
                                    {course.image_url ? (
                                        <img
                                            src={course.image_url}
                                            alt={course.title}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-secondary/20">
                                            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {course.category}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold tracking-tight text-lg mb-1 line-clamp-1">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {course.description}
                                    </p>
                                    <Button
                                        className="w-full"
                                        onClick={() => navigate(`/student/courses/${course.id}`)}
                                    >
                                        View Course
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No courses available yet.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default StudentDashboard;
