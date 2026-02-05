import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { PreferencesModal } from '@/components/PreferencesModal';
import { VideoCard, Video } from '@/components/VideoCard';
import { VideoPlayer } from '@/components/VideoPlayer';
import { videos } from '@/data/videos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Play, Sparkles } from 'lucide-react';
import { InteractiveAd } from '@/components/InteractiveAd';
import { LayoutTextFlip } from '@/components/ui/layout-text-flip';
import { TypewriterEffect } from '@/components/ui/typewriter-effect';

const Index = () => {
  const { user, updatePreferences, completeOnboarding } = useAuth();
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    // Check if first visit (no preferences set)
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited && !user?.hasCompletedOnboarding) {
      setShowPreferences(true);
    }
  }, [user]);

  const handlePreferencesComplete = (preferences: string[]) => {
    if (user) {
      updatePreferences(preferences);
      completeOnboarding();
    }
    localStorage.setItem('hasVisited', 'true');
    localStorage.setItem('guestPreferences', JSON.stringify(preferences));
    setShowPreferences(false);
    toast.success('Preferences saved! Enjoy personalized content.');
  };

  const handleWatchVideo = (video: Video) => {
    if (!user) {
      toast.error('Please sign up or log in to watch videos');
      return;
    }
    if (user.wallet_balance < video.pricePerMinute) {
      toast.error('Insufficient balance! Please add funds to your wallet.');
      return;
    }
    setSelectedVideo(video);
  };

  // Get preferences from user or localStorage
  const preferences = user?.preferences?.length
    ? user.preferences
    : JSON.parse(localStorage.getItem('guestPreferences') || '[]');

  // Filter videos based on preferences and active filter
  const filteredVideos = videos.filter(video => {
    if (activeFilter !== 'all') {
      return video.category === activeFilter;
    }
    if (preferences.length > 0) {
      return preferences.includes(video.category);
    }
    return true;
  });

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'educational', label: 'Educational' },
    { id: 'yoga', label: 'Yoga' },
    { id: 'dance', label: 'Dance' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Pay only for what you watch
            </Badge>
            <div className="flex flex-col items-center gap-5">
              <LayoutTextFlip
                text="Welcome to "
                words={["Murph", "Murph"]}
                duration={4000}
                className="text-8xl md:text-7xl font-bold tracking-tight mb-2"
              />

              <div className="text-xl md:text-2xl font-bold tracking-tight text-muted-foreground flex flex-row items-center justify-center gap-1 whitespace-nowrap">
                <span>Learn</span>
                <TypewriterEffect
                  text=" at your own pace, pay for your attention"
                  className="text-muted-foreground font-bold mb-0"
                  delay={1.5}
                />
              </div>
            </div>
            <p className="text-xl text-primary">
              Our unique engagement-based billing ensures you only pay for the time you're actively learning.
              No more wasted money on unwatched content.
            </p>
            {!user && (
              <div className="flex gap-4 justify-center">
                <Button size="lg" className="gap-2" asChild>
                  <a href="/signup">
                    <Play className="h-5 w-5" />
                    Start Learning Free
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/login">Sign In</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="container py-8">
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeFilter === cat.id ? 'default' : 'outline'}
              onClick={() => setActiveFilter(cat.id)}
              size="sm"
            >
              {cat.label}
            </Button>
          ))}
          {preferences.length > 0 && activeFilter === 'all' && (
            <Badge variant="outline" className="ml-2">
              Showing your preferences
            </Badge>
          )}
        </div>
      </section>

      {/* Video Grid */}
      <section className="container pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onWatch={handleWatchVideo}
            />
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No videos found for this category.</p>
            <Button
              variant="link"
              onClick={() => setActiveFilter('all')}
              className="mt-2"
            >
              View all videos
            </Button>
          </div>
        )}
      </section>

      {/* Preferences Modal */}
      <PreferencesModal
        open={showPreferences}
        onComplete={handlePreferencesComplete}
      />

      {/* Video Player */}
      <VideoPlayer
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      <InteractiveAd />
    </div>
  );
};

export default Index;
