import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, Dumbbell, Music } from 'lucide-react';

interface PreferencesModalProps {
  open: boolean;
  onComplete: (preferences: string[]) => void;
}

const preferenceOptions = [
  { id: 'educational', label: 'Educational', icon: BookOpen, description: 'Learn new skills and concepts' },
  { id: 'yoga', label: 'Yoga & Wellness', icon: Dumbbell, description: 'Mind and body practices' },
  { id: 'dance', label: 'Dance', icon: Music, description: 'Move and groove to the rhythm' },
];

export const PreferencesModal = ({ open, onComplete }: PreferencesModalProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  const togglePreference = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (selected.length > 0) {
      onComplete(selected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome! 🎉</DialogTitle>
          <DialogDescription className="text-center">
            Choose your interests to personalize your learning experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {preferenceOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => togglePreference(option.id)}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selected.includes(option.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Checkbox
                id={option.id}
                checked={selected.includes(option.id)}
                onCheckedChange={() => togglePreference(option.id)}
              />
              <option.icon className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <Label htmlFor={option.id} className="text-lg font-medium cursor-pointer">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={selected.length === 0}
            className="w-full"
            size="lg"
          >
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
