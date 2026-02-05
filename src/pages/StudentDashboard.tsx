import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, StudentDashboard as StudentDashboardData, Course, formatUrl } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MovingBorderCard } from '@/components/ui/moving-border';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, IndianRupee, Library, Play, Star } from 'lucide-react';
import { toast } from 'sonner';

const StudentDashboard = () => {
    const { user, refreshBalance } = useAuth();
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [lastWatched, setLastWatched] = useState<{ courseId: number; lectureId: number; title: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch external wallet balance first
                await refreshBalance();

                try {
                    const dashboardData = await api.getStudentDashboard();
                    setDashboard(dashboardData);
                } catch (dashErr) {
                    console.error('Failed to fetch dashboard data:', dashErr);
                    if (user) {
                        setDashboard({
                            email: user.email,
                            name: user.name,
                            wallet_balance: user.wallet_balance || 0,
                        });
                    }
                }

                try {
                    const coursesData = await api.getStudentCourses();
                    setCourses(coursesData);
                } catch (courseErr) {
                    console.error('Failed to fetch courses:', courseErr);
                    toast.error('Could not load courses');
                }

                // Load last watched
                const storedLastWatched = localStorage.getItem('lastWatched');
                if (storedLastWatched) {
                    setLastWatched(JSON.parse(storedLastWatched));
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

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
            <section className="relative py-16 overflow-hidden bg-slate-900 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-background/5" />
                <div className="container relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                Welcome back, <span className="text-primary-foreground">{dashboard?.name || user?.name}</span>
                            </h1>
                            <p className="text-lg text-slate-300">
                                Ready to continue your masterclass?
                            </p>
                        </div>

                        {lastWatched && (
                            <MovingBorderCard
                                containerClassName="w-full md:w-auto min-w-[320px] animate-in fade-in slide-in-from-right-8 duration-700 delay-200"
                                className="bg-white/10 border-white/10 backdrop-blur-md text-white shadow-xl"
                            >
                                <CardContent className="p-5 flex items-center justify-between gap-4">
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-blue-200 font-bold uppercase tracking-widest mb-1">
                                            Continue Watching
                                        </p>
                                        <p className="font-medium truncate max-w-[180px] text-white">{lastWatched.title}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => navigate(`/student/lecture/${lastWatched.lectureId}`)}
                                        className="bg-white text-slate-900 hover:bg-slate-200 font-semibold"
                                    >
                                        <Play className="h-4 w-4 mr-2 fill-current" />
                                        Resume
                                    </Button>
                                </CardContent>
                            </MovingBorderCard>
                        )}
                    </div>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="container py-10 -mt-8 relative z-20">
                <div className="grid gap-6 md:grid-cols-3">
                    <MovingBorderCard
                        containerClassName="animate-in fade-in zoom-in-95 duration-500 delay-100 mt-4"
                        className="shadow-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all duration-300 border-none bg-card backdrop-blur-sm"
                        borderRadius="0.75rem"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Wallet Balance</CardTitle>
                            <div className="p-2 bg-green-100 rounded-full">
                                <IndianRupee className="h-4 w-4 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">₹{user?.wallet_balance?.toFixed(2) || '0.00'}</div>
                            <p className="text-xs text-slate-500 mt-1">
                                Available for learning
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 w-full border-green-200 hover:bg-green-50 text-green-700"
                                onClick={() => navigate('/wallet')}
                            >
                                Add Funds
                            </Button>
                        </CardContent>
                    </MovingBorderCard>

                    <MovingBorderCard
                        containerClassName="animate-in fade-in zoom-in-95 duration-500 delay-200 mt-4"
                        className="shadow-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all duration-300 border-none bg-card backdrop-blur-sm"
                        borderRadius="0.75rem"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Courses Accessed</CardTitle>
                            <div className="p-2 bg-blue-100 rounded-full">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">{dashboard?.total_courses_accessed || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">
                                Courses you're enrolled in
                            </p>
                        </CardContent>
                    </MovingBorderCard>

                    <MovingBorderCard
                        containerClassName="animate-in fade-in zoom-in-95 duration-500 delay-300 mt-4"
                        className="shadow-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all duration-300 border-none bg-card backdrop-blur-sm"
                        borderRadius="0.75rem"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Watch Time</CardTitle>
                            <div className="p-2 bg-purple-100 rounded-full">
                                <Clock className="h-4 w-4 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">
                                {dashboard?.total_watch_time_minutes ?
                                    `${Math.floor(dashboard.total_watch_time_minutes / 60)}h ${Math.round(dashboard.total_watch_time_minutes % 60)}m`
                                    : '0h 0m'
                                }
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Time spent learning
                            </p>
                        </CardContent>
                    </MovingBorderCard>
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
                            <MovingBorderCard
                                key={course.id}
                                containerClassName="h-full"
                                className="group relative overflow-hidden rounded-lg border-none bg-card text-card-foreground shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="aspect-video w-full overflow-hidden bg-muted">
                                    {course.image_url ? (
                                        <img
                                            src={formatUrl(course.image_url)}
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
                                        <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            <span className="text-xs font-bold">
                                                {course.average_rating?.toFixed(1) || '0.0'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground ml-0.5">
                                                ({course.review_count || 0})
                                            </span>
                                        </div>
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
                            </MovingBorderCard>
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
