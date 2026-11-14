// Shared "how loud is Growwy talking right now" signal, read every frame by the Pachamama avatar to move her mouth.
// Server voice: real loudness from a Web Audio analyser. Device voice (speechSynthesis gives no audio access):
// a pulse on every spoken word plus a soft talking rhythm.

let speaking = false;
let paused = false;
let analyser: AnalyserNode | null = null;
let buf: Uint8Array<ArrayBuffer> | null = null;
let lastPulse = 0;

export function setSpeaking(on: boolean) {
  speaking = on;
  paused = false;
  if (!on) analyser = null;
}
export function setPaused(p: boolean) {
  paused = p;
}
export function setAnalyser(a: AnalyserNode | null) {
  analyser = a;
  buf = a ? new Uint8Array(new ArrayBuffer(a.fftSize)) : null;
}
/** Called on each word boundary of the device voice. */
export function pulse() {
  lastPulse = performance.now();
}
export const isSpeaking = () => speaking && !paused;

/** Mouth opening 0..1 for this frame. */
export function voiceLevel(now = performance.now()) {
  if (!speaking || paused) return 0;
  if (analyser && buf) {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 5);
  }
  // device voice: word pulses + syllable-like rhythm
  const word = Math.exp(-(now - lastPulse) / 160);
  const syllables = 0.5 + 0.5 * Math.sin(now / 62) * Math.sin(now / 151);
  return Math.min(1, 0.15 + 0.55 * word + 0.4 * syllables);
}
