import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = {
  MIC: 'audio:selectedMicId',
  SPEAKER: 'audio:selectedSpeakerId',
};

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioDevices {
  inputs: AudioDevice[];
  outputs: AudioDevice[];
  selectedMicId: string;
  selectedSpeakerId: string;
  setSelectedMicId: (deviceId: string) => void;
  setSelectedSpeakerId: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  isLoading: boolean;
}

export function useAudioDevices(): AudioDevices {
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([]);
  const [selectedMicId, setSelectedMicIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.MIC) || 'default';
  });
  const [selectedSpeakerId, setSelectedSpeakerIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.SPEAKER) || 'default';
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Request permission first to get device labels
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.log('Could not get initial audio permission:', e);
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs: AudioDevice[] = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`,
          kind: 'audioinput' as const,
        }));

      const audioOutputs: AudioDevice[] = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Lautsprecher ${d.deviceId.slice(0, 8)}`,
          kind: 'audiooutput' as const,
        }));

      setInputs(audioInputs);
      setOutputs(audioOutputs);

      // Validate stored selections still exist
      const savedMicId = localStorage.getItem(STORAGE_KEYS.MIC) || 'default';
      const savedSpeakerId = localStorage.getItem(STORAGE_KEYS.SPEAKER) || 'default';

      if (savedMicId !== 'default' && !audioInputs.find(d => d.deviceId === savedMicId)) {
        setSelectedMicIdState('default');
        localStorage.setItem(STORAGE_KEYS.MIC, 'default');
      }

      if (savedSpeakerId !== 'default' && !audioOutputs.find(d => d.deviceId === savedSpeakerId)) {
        setSelectedSpeakerIdState('default');
        localStorage.setItem(STORAGE_KEYS.SPEAKER, 'default');
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSelectedMicId = useCallback((deviceId: string) => {
    setSelectedMicIdState(deviceId);
    localStorage.setItem(STORAGE_KEYS.MIC, deviceId);
  }, []);

  const setSelectedSpeakerId = useCallback((deviceId: string) => {
    setSelectedSpeakerIdState(deviceId);
    localStorage.setItem(STORAGE_KEYS.SPEAKER, deviceId);
  }, []);

  useEffect(() => {
    refreshDevices();

    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  return {
    inputs,
    outputs,
    selectedMicId,
    selectedSpeakerId,
    setSelectedMicId,
    setSelectedSpeakerId,
    refreshDevices,
    isLoading,
  };
}
