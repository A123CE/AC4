/**
 * 浏览器 Web Speech 朗读封装
 * - 按句分段，避免长文本被截断
 * - 单例：新播放会取消旧实例
 * - 不支持时所有方法安全 no-op
 */

export const MAX_SEGMENT_LENGTH = 120;
export const RATE_MIN = 0.75;
export const RATE_MAX = 1.5;

export function splitSegments(text, maxLength = MAX_SEGMENT_LENGTH) {
  const source = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!source) return [];

  const sentences = source.match(/[^。！？!?\n]+[。！？!?\n]?/g) || [source];
  const segments = [];

  for (const sentence of sentences) {
    const value = sentence.trim();
    if (!value) continue;

    if (value.length <= maxLength) {
      segments.push(value);
      continue;
    }

    const clauses = value.split(/[，、,]/).filter(Boolean);
    let buffer = '';

    const flush = () => {
      if (buffer.trim()) segments.push(buffer.replace(/[，、,]$/, '').trim());
      buffer = '';
    };

    for (const clause of clauses) {
      if ((buffer + clause).length <= maxLength) {
        buffer += `${clause}，`;
      } else {
        flush();
        if (clause.length <= maxLength) {
          buffer = `${clause}，`;
        } else {
          for (let i = 0; i < clause.length; i += maxLength) {
            segments.push(clause.slice(i, i + maxLength));
          }
        }
      }
    }
    flush();
  }

  return segments.filter(Boolean);
}

export function isSpeechSupported(env = globalThis) {
  return !!(env?.speechSynthesis && env?.SpeechSynthesisUtterance);
}

export function createSpeech(envProvider = () => globalThis) {
  let segments = [];
  let index = 0;
  let rate = 1;
  let playing = false;
  let paused = false;
  let handlers = {};

  const environment = () => envProvider() || {};
  const support = () => isSpeechSupported(environment());

  function speakCurrent() {
    if (!support() || !segments.length) return;

    const env = environment();
    const synth = env.speechSynthesis;
    const Utterance = env.SpeechSynthesisUtterance;

    synth.cancel?.();

    const utterance = new Utterance(segments[index] || '');
    utterance.lang = 'zh-CN';
    utterance.rate = rate;

    try {
      const voices = synth.getVoices?.() || [];
      const voice = voices.find((item) => String(item.lang || '').startsWith('zh'));
      if (voice) utterance.voice = voice;
    } catch {
      /* 音色过滤失败时使用默认 */
    }

    utterance.onend = () => {
      if (index < segments.length - 1) {
        index += 1;
        handlers.onSegmentStart?.(index);
        speakCurrent();
      } else {
        playing = false;
        paused = false;
        handlers.onEnd?.();
      }
    };
    utterance.onerror = (event) => {
      playing = false;
      handlers.onError?.(event?.error || 'speech-error');
    };

    synth.speak?.(utterance);
    playing = true;
    paused = false;
  }

  return {
    get supported() {
      return support();
    },
    get segments() {
      return [...segments];
    },
    get index() {
      return index;
    },
    get rate() {
      return rate;
    },
    get playing() {
      return playing;
    },
    play(text) {
      if (!support()) return false;

      const synth = environment().speechSynthesis;
      synth.cancel?.();

      segments = splitSegments(text);
      index = 0;
      playing = true;
      paused = false;

      if (!segments.length) {
        playing = false;
        handlers.onEnd?.();
        return false;
      }

      handlers.onSegmentStart?.(0);
      speakCurrent();
      return true;
    },
    pause() {
      if (!playing || paused) return;

      const synth = environment().speechSynthesis;
      synth.pause?.();

      // Safari 可能无法真正暂停：停止并记住当前段
      if (synth.speaking && !synth.paused) {
        synth.cancel?.();
        paused = true;
        playing = false;
      } else {
        paused = true;
      }
    },
    resume() {
      if (paused) {
        paused = false;
        speakCurrent();
      } else {
        environment().speechSynthesis?.resume?.();
        paused = false;
      }
    },
    stop(clear = true) {
      environment().speechSynthesis?.cancel?.();
      playing = false;
      paused = false;
      if (clear) {
        segments = [];
        index = 0;
      }
    },
    setRate(next) {
      const value = Number(next);
      rate = Math.min(RATE_MAX, Math.max(RATE_MIN, Number.isFinite(value) ? value : 1));
      return rate;
    },
    seek(next) {
      if (!segments.length) return;
      const value = Number(next);
      index = Math.min(
        segments.length - 1,
        Math.max(0, Number.isFinite(value) ? value : 0)
      );
      handlers.onSegmentStart?.(index);
      if (playing || paused) speakCurrent();
    },
    setHandlers(next) {
      handlers = next || {};
    },
    reset() {
      this.stop(true);
      handlers = {};
    },
  };
}

export const speech = createSpeech();