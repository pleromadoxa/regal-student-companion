/** Pick the most natural English voice available for browser speechSynthesis fallback. */
export function pickNaturalSpeechVoice(
  voices: SpeechSynthesisVoice[],
  lang = "en"
): SpeechSynthesisVoice | undefined {
  const enVoices = voices.filter((v) => v.lang.startsWith(lang));
  if (enVoices.length === 0) return voices[0];

  const preferredNames = [
    "Samantha",
    "Karen",
    "Daniel",
    "Google US English",
    "Microsoft Aria",
    "Microsoft Jenny",
    "Microsoft Guy",
    "Alex",
    "Victoria",
    "Moira",
    "Tessa",
    "Fiona",
  ];

  for (const name of preferredNames) {
    const match = enVoices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  return (
    enVoices.find((v) => v.localService && !v.name.toLowerCase().includes("compact")) ??
    enVoices.find((v) => !v.name.toLowerCase().includes("compact")) ??
    enVoices[0]
  );
}

export function speakNaturally(
  text: string,
  options?: { rate?: number; pitch?: number; onEnd?: () => void }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options?.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 0.95;
  utterance.pitch = options?.pitch ?? 1.02;

  const assignVoice = () => {
    const voice = pickNaturalSpeechVoice(window.speechSynthesis.getVoices());
    if (voice) utterance.voice = voice;
  };

  assignVoice();
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      assignVoice();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }

  utterance.onend = () => options?.onEnd?.();
  utterance.onerror = () => options?.onEnd?.();
  window.speechSynthesis.speak(utterance);
}
