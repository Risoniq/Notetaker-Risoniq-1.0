import { cn } from '@/lib/utils';

interface AudioLevelIndicatorProps {
  level: number; // 0-100
  barCount?: number;
  className?: string;
  compact?: boolean;
}

export const AudioLevelIndicator = ({
  level,
  barCount = 8,
  className,
  compact = false,
}: AudioLevelIndicatorProps) => {
  const bars = Array.from({ length: barCount }, (_, i) => {
    const threshold = (i + 1) * (100 / barCount);
    const isActive = level >= threshold - (100 / barCount / 2);
    
    // Color gradient: green -> yellow -> red
    let colorClass = 'bg-emerald-500';
    if (i >= barCount * 0.75) {
      colorClass = 'bg-destructive';
    } else if (i >= barCount * 0.5) {
      colorClass = 'bg-warning';
    }
    
    return { isActive, colorClass };
  });

  return (
    <div 
      className={cn(
        'flex items-end gap-0.5',
        compact ? 'h-4' : 'h-6',
        className
      )}
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 rounded-sm transition-all duration-75',
            compact ? 'min-w-1' : 'min-w-1.5',
            bar.isActive ? bar.colorClass : 'bg-muted'
          )}
          style={{
            height: bar.isActive ? `${40 + (i * 60 / barCount)}%` : '20%',
            opacity: bar.isActive ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
};
