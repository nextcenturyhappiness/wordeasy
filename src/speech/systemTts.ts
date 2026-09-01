export const ENGLISH_TTS_LANG = "en-US";

export const SPEECH_UNAVAILABLE_MESSAGE = "Speech is not available on this device.";
export const SPEECH_FAILED_MESSAGE = "Speech could not start.";

export type SpeakWordResult = { ok: true } | { ok: false; message: string };

export function spokenWordForCard(card: { lemma: string; displayForm: string }): string {
  const lemma = card.lemma.trim();
  if (lemma.length > 0) {
    return lemma;
  }

  return card.displayForm.trim();
}

export function pickLocalEnglishVoice(
  voices: readonly SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return (
    english.find((voice) => voice.localService && /^en-us\b/i.test(voice.lang)) ??
    english.find((voice) => voice.localService) ??
    english.find((voice) => /^en-us\b/i.test(voice.lang)) ??
    english[0]
  );
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") {
    return null;
  }

  const synthesis = window.speechSynthesis;
  return synthesis === undefined ? null : synthesis;
}

export function cancelEnglishSpeech(): void {
  const synthesis = getSpeechSynthesis();
  if (synthesis === null) {
    return;
  }

  try {
    synthesis.cancel();
  } catch {
    // Broken TTS must not throw into the study UI.
  }
}

function getSpeechUtteranceCtor(): typeof SpeechSynthesisUtterance | null {
  if (typeof window === "undefined") {
    return null;
  }

  const Ctor = window.SpeechSynthesisUtterance;
  return typeof Ctor === "function" ? Ctor : null;
}

export function speakEnglishWord(word: string): SpeakWordResult {
  const text = word.trim();
  if (text.length === 0) {
    return { ok: false, message: "No English word to speak." };
  }

  const synthesis = getSpeechSynthesis();
  const Utterance = getSpeechUtteranceCtor();
  if (synthesis === null || Utterance === null) {
    return { ok: false, message: SPEECH_UNAVAILABLE_MESSAGE };
  }

  try {
    synthesis.cancel();
    const utterance = new Utterance(text);
    utterance.lang = ENGLISH_TTS_LANG;
    const voice = pickLocalEnglishVoice(synthesis.getVoices());
    if (voice !== undefined) {
      utterance.voice = voice;
    }
    utterance.onerror = () => {
      // Fail quietly after the user gesture; do not throw into React.
    };
    synthesis.speak(utterance);
    return { ok: true };
  } catch {
    return { ok: false, message: SPEECH_FAILED_MESSAGE };
  }
}
