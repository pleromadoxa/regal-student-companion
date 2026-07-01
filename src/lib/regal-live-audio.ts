/** Gemini Live native audio output is typically 24 kHz PCM (L16). */
export const LIVE_OUTPUT_SAMPLE_RATE = 24000;

export function parsePcmSampleRate(mimeType?: string): number {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? parseInt(match[1], 10) : LIVE_OUTPUT_SAMPLE_RATE;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function getSupportedRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Queue and play PCM int16 chunks from Gemini Live without gaps. */
export class PcmAudioPlayer {
  private ctx: AudioContext;
  private nextTime = 0;

  constructor(sampleRate = LIVE_OUTPUT_SAMPLE_RATE) {
    this.ctx = new AudioContext({ sampleRate });
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  enqueuePcmBase64(base64: string, mimeType?: string) {
    const sampleRate = parsePcmSampleRate(mimeType);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const int16 = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2)
    );
    if (int16.length === 0) return;

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = this.ctx.createBuffer(1, float32.length, sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now;
    source.start(this.nextTime);
    this.nextTime += buffer.duration;
  }

  reset() {
    this.nextTime = 0;
  }

  close() {
    void this.ctx.close();
  }
}
