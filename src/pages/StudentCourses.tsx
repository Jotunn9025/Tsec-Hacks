import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Course } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { CourseCard } from '@/components/CourseCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

const StudentCourses = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await api.getStudentCourses();
                setCourses(data);
            } catch (error) {
                console.error('Failed to fetch courses:', error);
                // Silently fail - show empty state instead of error toast
                setCourses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <section className="relative py-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
                <div className="container relative">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl font-bold tracking-tight mb-2">
                            Explore Courses
                        </h1>
                        <p className="text-xl text-muted-foreground mb-8">
                            Discover courses and start your learning journey
                        </p>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search courses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-12 text-lg"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="container pb-20">
                {loading ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">Loading courses...</p>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground text-lg">
                            {searchQuery ? 'No courses found matching your search' : 'No courses available'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCourses.map((course) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                variant="student"
                                onView={(courseId) => navigate(`/student/courses/${courseId}`)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default StudentCourses;
