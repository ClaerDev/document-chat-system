/**
 * Sound Effects Utility
 * 
 * Provides sound effects for user interactions
 */

// Sound effect types
export enum SoundEffect {
  FILE_DROP = 'file-drop',
  FOLDER_DELETE = 'folder-delete',
  SUCCESS = 'success',
  ERROR = 'error',
  NOTIFICATION = 'notification',
}

// Sound configurations
const SOUND_CONFIG = {
  [SoundEffect.FILE_DROP]: {
    frequency: 600,
    duration: 150,
    type: 'sine' as OscillatorType,
    volume: 0.3,
  },
  [SoundEffect.FOLDER_DELETE]: {
    frequency: 200,
    duration: 200,
    type: 'square' as OscillatorType,
    volume: 0.2,
  },
  [SoundEffect.SUCCESS]: {
    frequency: 800,
    duration: 100,
    type: 'sine' as OscillatorType,
    volume: 0.3,
  },
  [SoundEffect.ERROR]: {
    frequency: 300,
    duration: 250,
    type: 'sawtooth' as OscillatorType,
    volume: 0.2,
  },
  [SoundEffect.NOTIFICATION]: {
    frequency: 500,
    duration: 200,
    type: 'triangle' as OscillatorType,
    volume: 0.3,
  },
};

class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize audio context lazily to avoid browser warnings
    if (typeof window !== 'undefined') {
      this.initializeAudioContext();
      this.loadPreference();
    }
  }

  private initializeAudioContext() {
    if (!this.audioContext && typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Play a sound effect
   */
  play(effect: SoundEffect) {
    if (!this.enabled || typeof window === 'undefined') return;

    // Ensure audio context is initialized
    this.initializeAudioContext();
    if (!this.audioContext) return;

    try {
      const config = SOUND_CONFIG[effect];
      if (!config) return;

      // Create oscillator
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Configure oscillator
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);

      // Configure gain (volume)
      gainNode.gain.setValueAtTime(config.volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration / 1000);

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play sound
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + config.duration / 1000);

      // Special effects for specific sounds
      if (effect === SoundEffect.FILE_DROP) {
        // Add a subtle "plop" effect with a second tone
        setTimeout(() => {
          const secondOscillator = this.audioContext!.createOscillator();
          const secondGainNode = this.audioContext!.createGain();
          
          secondOscillator.type = 'sine';
          secondOscillator.frequency.setValueAtTime(800, this.audioContext!.currentTime);
          secondGainNode.gain.setValueAtTime(0.2, this.audioContext!.currentTime);
          secondGainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.05);
          
          secondOscillator.connect(secondGainNode);
          secondGainNode.connect(this.audioContext!.destination);
          
          secondOscillator.start(this.audioContext!.currentTime);
          secondOscillator.stop(this.audioContext!.currentTime + 0.05);
        }, 50);
      }

      if (effect === SoundEffect.FOLDER_DELETE) {
        // Add a descending tone effect
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + config.duration / 1000);
      }

    } catch (error) {
      console.warn('Failed to play sound effect:', error);
    }
  }

  /**
   * Play a custom tone
   */
  playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled || typeof window === 'undefined') return;

    this.initializeAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Failed to play custom tone:', error);
    }
  }

  /**
   * Enable/disable sound effects
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Check if sound effects are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get sound effect from local storage preference
   */
  loadPreference() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('soundEffectsEnabled');
      this.enabled = stored !== 'false'; // Default to true
    }
  }

  /**
   * Save sound effect preference to local storage
   */
  savePreference() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('soundEffectsEnabled', String(this.enabled));
    }
  }
}

// Create singleton instance
export const soundEffects = new SoundEffectsManager();

// Hook for React components
export function useSoundEffects() {
  return {
    play: (effect: SoundEffect) => soundEffects.play(effect),
    playTone: (frequency: number, duration: number, type?: OscillatorType, volume?: number) => 
      soundEffects.playTone(frequency, duration, type, volume),
    setEnabled: (enabled: boolean) => {
      soundEffects.setEnabled(enabled);
      soundEffects.savePreference();
    },
    isEnabled: () => soundEffects.isEnabled(),
  };
}