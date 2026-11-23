import { useEffect, useMemo, useRef, useState } from 'react';
import { speech, splitSegments } from '../lib/speech';
import { useReducedMotion } from '../lib/motion';
import { track } from '../lib/analytics';

const RATES = [0.75, 1, 1.25, 1.5];

/**
 * 语音讲解播放器
 * - 不自动播放
 * - 分段高亮 + 滚动跟随
 * - 不支持 TTS 时禁用播放并提供复制
 */
export default function AudioGuidePlayer({
  text = '',
  title = '语音讲解',
  audioUrl = '',
  audioDuration = null,
  isCurrent = true,
}) {
  const segments = useMemo(() => splitSegments(text), [text]);
  const [supported] = useState(() => speech.supported);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const [rate, setRate] = useState(1);
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const reducedMotion = useReducedMotion();
  const containerRef = useRef(null);

  useEffect(() => {
    speech.setHandlers({
      onSegmentStart: (index) => {
        setActive(index);
        setPlaying(true);
      },
      onEnd: () => {
        setPlaying(false);
        setPaused(false);
        setActive(0);
      },
      onError: () => {
        setPlaying(false);
        setPaused(false);
      },
    });

    return () => {
      speech.stop();
    };
  }, []);

  useEffect(() => {
    speech.stop();
    setPlaying(false);
    setPaused(false);
    setActive(0);
    setAudioFailed(false);
    setAudioProgress(0);
  }, [text, audioUrl]);

  const useAudio = !!audioUrl && !audioFailed;
  const activeIndex = useAudio
    ? Math.min(
        Math.max(segments.length - 1, 0),
        Math.floor(audioProgress * segments.length)
      )
    : active;

  useEffect(() => {
    if (!playing && !useAudio) return;
    const node = containerRef.current?.querySelector(
      `[data-seg-index="${activeIndex}"]`
    );
    node?.scrollIntoView?.({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [activeIndex, playing, useAudio, reducedMotion]);

  const toggle = () => {
    if (!supported) return;

    if (playing) {
      speech.pause();
      setPlaying(false);
      setPaused(true);
      return;
    }

    if (paused) {
      speech.resume();
      setPaused(false);
      setPlaying(true);
      return;
    }

    track('tts_play', { entity_type: 'palace' });

    const started = speech.play(text);
    setPlaying(!!started);
    setPaused(false);
  };

  const stop = () => {
    speech.stop();
    setPlaying(false);
    setPaused(false);
    setActive(0);
  };

  const changeRate = (value) => {
    speech.setRate(value);
    setRate(value);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      /* 剪贴板不可用时保持静默 */
    }
  };

  if (!text && !audioUrl) return null;

  return (
    <div className="audio-guide" ref={containerRef}>
      {useAudio ? (
        <div className="audio-guide-bar">
          <strong>
            <i className="fas fa-headphones" /> {title}
          </strong>

          <audio
            className="audio-guide-audio"
            controls
            preload="none"
            src={audioUrl}
            onTimeUpdate={(event) => {
              const duration =
                event.currentTarget.duration || Number(audioDuration) || 0;
              setAudioProgress(
                duration > 0 ? event.currentTarget.currentTime / duration : 0
              );
            }}
            onError={() => setAudioFailed(true)}
          />

          <span className="audio-guide-progress">
            音频进度 {Math.round(audioProgress * 100)}%
          </span>
        </div>
      ) : (
        <div className="audio-guide-bar">
          <strong>
            <i className="fas fa-headphones" /> {title}
          </strong>

          <button
            type="button"
            className="audio-guide-btn"
            onClick={toggle}
            disabled={!supported}
            aria-label={playing ? '暂停朗读' : '开始朗读'}
          >
            <i className={`fas ${playing ? 'fa-pause' : 'fa-play'}`} />
          </button>

          <button
            type="button"
            className="audio-guide-btn"
            onClick={stop}
            disabled={!supported}
            aria-label="停止朗读"
          >
            <i className="fas fa-stop" />
          </button>

          <label className="audio-guide-rate">
            语速
            <select value={rate} onChange={(event) => changeRate(Number(event.target.value))}>
              {RATES.map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </label>

          <span className="audio-guide-progress">
            段落 {Math.min(active + 1, segments.length || 1)}/{segments.length}
          </span>
        </div>
      )}

      {useAudio && !isCurrent && (
        <p className="audio-guide-warning" role="status">
          音频为历史版本，以文字讲解为准。
        </p>
      )}

      {!useAudio && !supported && (
        <p className="audio-guide-unsupported">
          当前浏览器不支持朗读，可复制讲解词。
          <button type="button" onClick={copyText}>
            复制讲解词
          </button>
        </p>
      )}

      <div className="audio-guide-text" aria-live="polite">
        {!useAudio && playing && (
          <p className="audio-guide-live" role="status">
            正在朗读第 {active + 1} 段
          </p>
        )}

        {segments.map((segment, index) => (
          <p
            key={`${index}-${segment.slice(0, 8)}`}
            data-seg-index={index}
            aria-current={activeIndex === index ? 'true' : undefined}
            className={
              activeIndex === index && (playing || paused || useAudio)
                ? 'is-active'
                : ''
            }
          >
            {segment}
          </p>
        ))}
      </div>
    </div>
  );
}