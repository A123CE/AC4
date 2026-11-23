import { describe, it, expect, vi } from 'vitest';
import {
  splitSegments,
  isSpeechSupported,
  createSpeech,
} from '../speech';

function createEnv() {
  const spoken = [];
  const synth = {
    speaking: false,
    paused: false,
    cancel: vi.fn(() => {
      synth.speaking = false;
      synth.paused = false;
    }),
    pause: vi.fn(() => {
      synth.paused = true;
    }),
    resume: vi.fn(() => {
      synth.paused = false;
    }),
    speak: vi.fn((utterance) => {
      spoken.push(utterance);
      synth.speaking = true;
    }),
    getVoices: () => [{ lang: 'zh-CN' }],
  };

  class Utterance {
    constructor(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.onend = null;
      this.onerror = null;
    }
  }

  return {
    env: { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance },
    spoken,
    synth,
  };
}

describe('speech 朗读封装', () => {
  it('按句分段', () => {
    const segments = splitSegments('第一句。第二句！第三句？');
    expect(segments).toHaveLength(3);
  });

  it('播放按段推进并停在最后一段', () => {
    const { env, spoken } = createEnv();
    const controller = createSpeech(() => env);

    expect(controller.play('一。二。')).toBe(true);
    expect(controller.segments).toHaveLength(2);
    expect(spoken[0].text).toBe('一。');

    spoken[0].onend();
    expect(controller.index).toBe(1);
    expect(spoken[1].text).toBe('二。');

    spoken[1].onend();
    expect(controller.index).toBe(1);
  });

  it('seek 从指定段开始而不是重头', () => {
    const { env, spoken } = createEnv();
    const controller = createSpeech(() => env);

    controller.play('一。二。三。四。');
    controller.seek(3);
    expect(spoken[spoken.length - 1].text).toBe('四。');
  });

  it('语速限制在 0.75~1.5', () => {
    const { env, spoken } = createEnv();
    const controller = createSpeech(() => env);

    controller.setRate(1.5);
    controller.play('测试。');
    expect(spoken[0].rate).toBe(1.5);

    controller.setRate(9);
    expect(controller.rate).toBe(1.5);
  });

  it('两次播放只保留最后一个实例', () => {
    const { env, synth, spoken } = createEnv();
    const controller = createSpeech(() => env);

    controller.play('旧内容。');
    controller.play('新内容。');

    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken[spoken.length - 1].text).toBe('新内容。');
  });

  it('不支持时 supported=false 且方法安全 no-op', () => {
    const controller = createSpeech(() => ({}));
    expect(controller.supported).toBe(false);
    expect(controller.play('测试')).toBe(false);
    expect(() => {
      controller.pause();
      controller.resume();
      controller.stop();
      controller.seek(1);
    }).not.toThrow();
    expect(isSpeechSupported({})).toBe(false);
  });
});