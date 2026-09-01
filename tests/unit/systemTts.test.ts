import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ENGLISH_TTS_LANG,
  SPEECH_FAILED_MESSAGE,
  SPEECH_UNAVAILABLE_MESSAGE,
  cancelEnglishSpeech,
  pickLocalEnglishVoice,
  speakEnglishWord,
  spokenWordForCard
} from "../../src/speech/systemTts";

interface FakeVoice extends SpeechSynthesisVoice {
  lang: string;
  localService: boolean;
  name: string;
}

class FakeUtterance {
  text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function voice(overrides: Partial<FakeVoice> & Pick<FakeVoice, "lang" | "name">): FakeVoice {
  return {
    default: false,
    localService: true,
    voiceURI: overrides.name,
    ...overrides
  };
}

function installSpeechSynthesis(options?: {
  voices?: SpeechSynthesisVoice[];
  speakImpl?: (utterance: SpeechSynthesisUtterance) => void;
}) {
  const cancel = vi.fn();
  const speak = vi.fn((utterance: SpeechSynthesisUtterance) => {
    options?.speakImpl?.(utterance);
  });
  const getVoices = vi.fn(() => options?.voices ?? []);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      cancel,
      speak,
      getVoices,
      paused: false,
      pending: false,
      speaking: false
    }
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: FakeUtterance
  });
  return { cancel, speak, getVoices };
}

afterEach(() => {
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
});

describe("spokenWordForCard", () => {
  it("prefers lemma over displayForm so TTS never receives IPA", () => {
    expect(spokenWordForCard({ lemma: "attenuate", displayForm: "attenuated" })).toBe("attenuate");
    expect(spokenWordForCard({ lemma: "  ", displayForm: "attenuated" })).toBe("attenuated");
  });
});

describe("pickLocalEnglishVoice", () => {
  it("prefers a local en-US voice when the browser lists one", () => {
    const localUs = voice({ lang: "en-US", name: "Samantha", localService: true });
    expect(
      pickLocalEnglishVoice([
        voice({ lang: "zh-CN", name: "Tingting", localService: true }),
        voice({ lang: "en-GB", name: "Daniel", localService: true }),
        voice({ lang: "en-US", name: "Google US English", localService: false }),
        localUs
      ])
    ).toBe(localUs);
  });
});

describe("speakEnglishWord", () => {
  it("returns an honest message when speechSynthesis is missing", () => {
    expect(speakEnglishWord("attenuate")).toEqual({
      ok: false,
      message: SPEECH_UNAVAILABLE_MESSAGE
    });
  });

  it("speaks the given English word with en-US and a local English voice", () => {
    const { cancel, speak } = installSpeechSynthesis({
      voices: [voice({ lang: "en-US", name: "Samantha", localService: true })]
    });

    expect(speakEnglishWord("attenuate")).toEqual({ ok: true });

    const utterance = speak.mock.calls[0]?.[0];
    expect(utterance).toMatchObject({ text: "attenuate", lang: ENGLISH_TTS_LANG });
    expect(utterance?.text).not.toMatch(/\//u);
    expect(utterance?.voice?.name).toBe("Samantha");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels and restarts when speak is called again", () => {
    const { cancel, speak } = installSpeechSynthesis();

    expect(speakEnglishWord("attenuate")).toEqual({ ok: true });
    expect(speakEnglishWord("attenuate")).toEqual({ ok: true });
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(speak.mock.invocationCallOrder[0] ?? 0);
    expect(cancel.mock.invocationCallOrder[1]).toBeLessThan(speak.mock.invocationCallOrder[1] ?? 0);
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it("returns an honest message when speak throws", () => {
    installSpeechSynthesis({
      speakImpl: () => {
        throw new Error("no audio device");
      }
    });

    expect(speakEnglishWord("attenuate")).toEqual({
      ok: false,
      message: SPEECH_FAILED_MESSAGE
    });
  });

  it("does not throw when cancel is called without speechSynthesis", () => {
    expect(() => {
      cancelEnglishSpeech();
    }).not.toThrow();
  });
});
