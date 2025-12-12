import { Mic, Volume2, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AudioDevices } from '@/hooks/useAudioDevices';
import { cn } from '@/lib/utils';

interface AudioDeviceSelectorProps {
  devices: AudioDevices;
  disabled?: boolean;
  className?: string;
}

export const AudioDeviceSelector = ({
  devices,
  disabled = false,
  className,
}: AudioDeviceSelectorProps) => {
  const {
    inputs,
    outputs,
    selectedMicId,
    selectedSpeakerId,
    setSelectedMicId,
    setSelectedSpeakerId,
    refreshDevices,
    isLoading,
  } = devices;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Audio-Geräte</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshDevices}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Microphone Selection */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mic size={14} />
          Mikrofon
        </label>
        <Select
          value={selectedMicId}
          onValueChange={setSelectedMicId}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Mikrofon wählen..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="default">Standard-Mikrofon</SelectItem>
            {inputs.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Speaker Selection */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 size={14} />
          Lautsprecher
        </label>
        <Select
          value={selectedSpeakerId}
          onValueChange={setSelectedSpeakerId}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Lautsprecher wählen..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="default">Standard-Lautsprecher</SelectItem>
            {outputs.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
