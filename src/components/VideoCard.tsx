import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play } from 'lucide-react';

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  duration: number; // in minutes
  pricePerMinute: number;
  instructor: string;
}

interface VideoCardProps {
  video: Video;
  onWatch: (video: Video) => void;
  isPurchased?: boolean;
}

export const VideoCard = ({ video, onWatch, isPurchased }: VideoCardProps) => {
  const categoryColors: Record<string, string> = {
    educational: 'bg-blue-500/20 text-blue-500',
    yoga: 'bg-green-500/20 text-green-500',
    dance: 'bg-pink-500/20 text-pink-500',
  };

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardHeader className="p-0 relative">
        <div className="aspect-video bg-muted relative overflow-hidden">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="h-16 w-16 text-white fill-white" />
          </div>
        </div>
        <Badge className={`absolute top-3 right-3 ${categoryColors[video.category]}`}>
          {video.category}
        </Badge>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1">{video.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{video.description}</p>
        <p className="text-sm text-muted-foreground mt-2">by {video.instructor}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {video.duration} min
          </span>
          <span className="font-medium text-primary">₹{video.pricePerMinute}/min</span>
        </div>
        <Button size="sm" onClick={() => onWatch(video)}>
          {isPurchased ? 'Continue' : 'Watch'}
        </Button>
      </CardFooter>
    </Card>
  );
};
