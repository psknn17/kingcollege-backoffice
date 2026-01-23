// Notification sound utility using Web Audio API
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

type SoundType = 'success' | 'error' | 'info' | 'warning';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

const soundConfigs: Record<SoundType, SoundConfig[]> = {
  success: [
    { frequency: 880, duration: 0.08, type: 'sine', volume: 0.15 }, // soft high beep
  ],
  error: [
    { frequency: 300, duration: 0.1, type: 'sine', volume: 0.12 }, // soft low beep
  ],
  warning: [
    { frequency: 520, duration: 0.08, type: 'sine', volume: 0.12 }, // soft mid beep
  ],
  info: [
    { frequency: 660, duration: 0.08, type: 'sine', volume: 0.12 }, // soft beep
  ],
};

export const playNotificationSound = (type: SoundType = 'info') => {
  if (!audioContext) return;

  // Resume audio context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const config = soundConfigs[type];
  let startTime = audioContext.currentTime;

  config.forEach((sound) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.frequency, startTime);

    gainNode.gain.setValueAtTime(sound.volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + sound.duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + sound.duration);

    startTime += sound.duration;
  });
};

// Enable sound by default
let soundEnabled = true;

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
};

export const isSoundEnabled = () => soundEnabled;

export const playSound = (type: SoundType = 'info') => {
  if (soundEnabled) {
    playNotificationSound(type);
  }
};
