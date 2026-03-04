/**
 * Voice mode infrastructure — STUB.
 * Will support STT (Whisper) and TTS for spoken debate mode.
 * Time caps replace word caps in voice mode.
 * Prep window gives students thinking time before each round.
 */

export interface VoiceConfig {
  ttsVoice?: string;
  sttLanguage?: string;
  timeCap?: number;   // seconds per response (default 90)
  prepWindow?: number; // seconds before each round (default 30)
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
}

export interface SpeechResult {
  audioUrl: string;
  duration: number;
}

/**
 * Transcribe audio buffer to text via Whisper API.
 * STUB: Returns error indicating voice mode is not yet available.
 */
export async function transcribeAudio(
  _audioBuffer: Buffer,
  _config?: VoiceConfig,
): Promise<TranscriptionResult> {
  throw new Error('Voice mode is not yet available. Please use text mode.');
}

/**
 * Synthesize speech from text with persona-appropriate voice.
 * STUB: Returns error indicating voice mode is not yet available.
 */
export async function synthesizeSpeech(
  _text: string,
  _persona?: string,
  _config?: VoiceConfig,
): Promise<SpeechResult> {
  throw new Error('Voice mode is not yet available. Please use text mode.');
}

/**
 * Check if voice mode is available.
 */
export function isVoiceModeAvailable(): boolean {
  return false;
}
