import { Mic, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioLevelIndicator } from './AudioLevelIndicator';
import { MicrophoneTest } from '@/hooks/useMicrophoneTest';
import { cn } from '@/lib/utils';

interface MicrophoneTestButtonProps {
  test: MicrophoneTest;
  selectedMicId?: string;
  disabled?: boolean;
  className?: string;
}

export const MicrophoneTestButton = ({
  test,
  selectedMicId,
  disabled = false,
  className,
}: MicrophoneTestButtonProps) => {
  const { status, level, errorMessage, startTest, stopTest } = test;

  const handleClick = () => {
    if (status === 'testing') {
      stopTest();
    } else {
      startTest(selectedMicId);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-3">
        <Button
          variant={status === 'testing' ? 'destructive' : 'outline'}
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          {status === 'idle' && (
            <>
              <Mic size={16} />
              Mikrofon testen
            </>
          )}
          {status === 'testing' && (
            <>
              <Loader2 size={16} className="animate-spin" />
              Test läuft...
            </>
          )}
          {status === 'success' && (
            <>
              <Check size={16} />
              Test erfolgreich
            </>
          )}
          {status === 'error' && (
            <>
              <X size={16} />
              Fehler
            </>
          )}
        </Button>

        {status === 'testing' && (
          <AudioLevelIndicator level={level} compact className="w-20" />
        )}
      </div>

      {status === 'error' && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {status === 'testing' && (
        <p className="text-xs text-muted-foreground">
          Sprich ins Mikrofon, um den Pegel zu sehen. Test endet automatisch nach 5 Sekunden.
        </p>
      )}
    </div>
  );
};
