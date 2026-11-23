import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { mockSpeech } = vi.hoisted(() => ({
  mockSpeech: {
    supported: true,
    setHandlers: vi.fn(),
    play: vi.fn(() => true),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    setRate: vi.fn(),
    index: 0,
    segments: [],
  },
}));

vi.mock('../lib/speech', () => ({
  speech: mockSpeech,
  splitSegments: (text) =>
    String(text)
      .split('。')
      .map((item) => item.trim())
      .filter(Boolean),
}));

import AudioGuidePlayer from '../components/AudioGuidePlayer';

beforeEach(() => {
  vi.clearAllMocks();
  mockSpeech.supported = true;
});

describe('AudioGuidePlayer', () => {
  it('打开时不自动播放，点击后开始朗读', () => {
    render(<AudioGuidePlayer text="第一段。第二段。" title="语音讲解" />);

    expect(mockSpeech.play).not.toHaveBeenCalled();
    expect(screen.getByText('第一段')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '开始朗读' }));
    expect(mockSpeech.play).toHaveBeenCalledWith('第一段。第二段。');
  });

  it('支持暂停与调速', () => {
    render(<AudioGuidePlayer text="一段。二段。" />);

    fireEvent.click(screen.getByRole('button', { name: '开始朗读' }));
    fireEvent.click(screen.getByRole('button', { name: '暂停朗读' }));
    expect(mockSpeech.pause).toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1.5' } });
    expect(mockSpeech.setRate).toHaveBeenCalledWith(1.5);
  });

  it('真人音频优先渲染原生 audio 且不自动播放', () => {
    const { container } = render(
      <AudioGuidePlayer
        text="一段。二段。"
        audioUrl="/audio/guides/test.mp3"
        audioDuration={30}
        isCurrent
      />
    );

    const audio = container.querySelector('audio');
    expect(audio).toBeTruthy();
    expect(audio).toHaveAttribute('src', '/audio/guides/test.mp3');
    expect(audio).not.toHaveAttribute('autoplay');
    expect(mockSpeech.play).not.toHaveBeenCalled();
  });

  it('音频为历史版本时显示提示', () => {
    render(
      <AudioGuidePlayer
        text="一段。"
        audioUrl="/audio/guides/old.mp3"
        isCurrent={false}
      />
    );

    expect(screen.getByText(/音频为历史版本/)).toBeInTheDocument();
  });

  it('不支持 TTS 时禁用播放并提供复制', () => {
    mockSpeech.supported = false;

    render(<AudioGuidePlayer text="无法朗读的文本。" />);

    expect(screen.getByRole('button', { name: '开始朗读' })).toBeDisabled();
    expect(screen.getByText('复制讲解词')).toBeInTheDocument();
  });
});