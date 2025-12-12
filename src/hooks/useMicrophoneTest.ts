import { useState, useRef, useCallback } from 'react';
import { useAudioLevel } from './useAudioLevel';

export type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export interface MicrophoneTest {
  status: TestStatus;
  level: number;
  errorMessage: string;
  startTest: (deviceId?: string) => Promise<void>;
  stopTest: () => void;
}

export function useMicrophoneTest(): MicrophoneTest {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);
  
  const level = useAudioLevel(testStream);

  const stopTest = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
      setTestStream(null);
    }
    
    if (status === 'testing') {
      setStatus('success');
      // Reset to idle after showing success
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [testStream, status]);

  const startTest = useCallback(async (deviceId?: string) => {
    // Stop any existing test
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
    }
    
    setStatus('testing');
    setErrorMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('Kein Audio-Track gefunden');
      }

      console.log('Test microphone:', audioTracks[0].label);
      setTestStream(stream);

      // Auto-stop after 5 seconds
      timeoutRef.current = window.setTimeout(() => {
        stopTest();
      }, 5000);

    } catch (error: any) {
      console.error('Microphone test error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Mikrofon-Test fehlgeschlagen');
      setTestStream(null);
      
      // Reset to idle after showing error
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [testStream, stopTest]);

  return {
    status,
    level,
    errorMessage,
    startTest,
    stopTest,
  };
}
