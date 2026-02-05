import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const InstructorLectureNew = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        video_url: '',
        duration: 0,
        price_per_10_mins: 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;

        setLoading(true);

        try {
            await api.createLecture(parseInt(courseId), formData);
            toast.success('Lecture created successfully!');
            navigate(`/instructor/courses/${courseId}`);
        } catch (error) {
            console.error('Failed to create lecture:', error);
            toast.error('Failed to create lecture');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <section className="container py-8 max-w-2xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/instructor/courses/${courseId}`)}
                    className="mb-6 gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Course
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Add New Lecture</CardTitle>
                        <CardDescription>
                            Create a new lecture for your course
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Lecture Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Introduction to Variables"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe what this lecture covers..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="video_url">Video URL *</Label>
                                <Input
                                    id="video_url"
                                    type="url"
                                    placeholder="https://example.com/video.mp4"
                                    value={formData.video_url}
                                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Provide a direct link to the video file
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration (minutes) *</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="30"
                                        value={formData.duration || ''}
                                        onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price">Price per 10 Minutes (₹) *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="10.00"
                                        value={formData.price_per_10_mins || ''}
                                        onChange={(e) => setFormData({ ...formData, price_per_10_mins: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading ? 'Creating...' : 'Create Lecture'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(`/instructor/courses/${courseId}`)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};

export default InstructorLectureNew;
