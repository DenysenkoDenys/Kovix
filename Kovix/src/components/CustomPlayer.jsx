import React, { useRef, useState, useEffect, useCallback } from 'react';
import '../style/CustomPlayer.css';

function isYouTubeUrl(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(url || '');
}

function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch (e) {
    return url;
  }
  return url;
}

function fmt(s) {
  if (isNaN(s) || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  play:    'M5 3l14 9-14 9V3z',
  pause:   'M6 4h4v16H6V4zm8 0h4v16h-4V4z',
  volOn:   'M11 5L6 9H2v6h4l5 4V5zm6.07 1.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07',
  volOff:  'M11 5L6 9H2v6h4l5 4V5zm10 0L15 11m0-6l6 6',
  expand:  'M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3',
  compress:'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  video:   'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
};

function CtrlButton({ onClick, title, children }) {
  const [h, setH] = useState(false);
  return (
    <button
      className="cp-ctrlbtn"
      style={{ color: h ? '#fff' : 'rgba(255,255,255,0.75)', transform: h ? 'scale(1.12)' : 'scale(1)' }}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function HTML5Player({ src, poster, title }) {
  const videoRef = useRef(null);
  const hideTimer = useRef(null);
  const outerRef = useRef(null);

  const [playing, setPlaying]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [volume, setVolume]         = useState(1);
  const [muted, setMuted]           = useState(false);
  const [showCtrl, setShowCtrl]     = useState(true);
  const [progHover, setProgHover]   = useState(false);
  const [bigHover, setBigHover]     = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 2800);
  }, []);

  const showControls = useCallback(() => {
    setShowCtrl(true);
    if (playing) scheduleHide();
  }, [playing, scheduleHide]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onPlay  = () => { setPlaying(true);  scheduleHide(); };
    const onPause = () => { setPlaying(false); clearTimeout(hideTimer.current); setShowCtrl(true); };
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); setShowCtrl(true); };
    const onTime  = () => {
      setCurrentTime(vid.currentTime);
      if (vid.duration) setProgress(vid.currentTime / vid.duration * 100);
    };
    const onMeta  = () => setDuration(vid.duration);
    const onFS    = () => setFullscreen(!!document.fullscreenElement);

    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('ended', onEnded);
    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('loadedmetadata', onMeta);
    document.addEventListener('fullscreenchange', onFS);
    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('ended', onEnded);
      vid.removeEventListener('timeupdate', onTime);
      vid.removeEventListener('loadedmetadata', onMeta);
      document.removeEventListener('fullscreenchange', onFS);
      clearTimeout(hideTimer.current);
    };
  }, [scheduleHide]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.paused ? vid.play() : vid.pause();
  };

  const seek = (e) => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    vid.currentTime = ((e.clientX - r.left) / r.width) * vid.duration;
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const next = !muted;
    vid.muted = next;
    setMuted(next);
  };

  const changeVolume = (e) => {
    const vid = videoRef.current;
    if (!vid) return;
    const v = parseFloat(e.target.value);
    vid.volume = v;
    setVolume(v);
    if (v === 0) { vid.muted = true; setMuted(true); }
    else { vid.muted = false; setMuted(false); }
  };

  const toggleFullscreen = () => {
    const el = outerRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.();
  };

  return (
    <div className="cp-outer" ref={outerRef} onMouseMove={showControls} onMouseLeave={() => playing && scheduleHide()}>
      {title && (
        <div className="cp-titlebar">
          <span className="cp-titletext">{title}</span>
        </div>
      )}
      <div className="cp-ratio">
        <video
          ref={videoRef}
          className="cp-media"
          src={src}
          poster={poster}
          preload="metadata"
        />
        <div className="cp-overlay" style={{ opacity: showCtrl ? 1 : 0, pointerEvents: showCtrl ? 'all' : 'none' }}>
          <div className="cp-center" onClick={togglePlay}>
            <div
              className="cp-bigbtn"
              onMouseEnter={() => setBigHover(true)}
              onMouseLeave={() => setBigHover(false)}
              style={{ background: bigHover ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.13)', transform: bigHover ? 'scale(1.1)' : 'scale(1)' }}
            >
              <Icon d={playing ? ICONS.pause : ICONS.play} size={26} />
            </div>
          </div>

          <div className="cp-controls">
            <div
              className="cp-progresswrap"
              onClick={seek}
              onMouseEnter={() => setProgHover(true)}
              onMouseLeave={() => setProgHover(false)}
              role="slider"
              aria-label="Прогрес відео"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="cp-progressbg" style={{ height: progHover ? 5 : 3 }}>
                <div className="cp-progressfill" style={{ width: `${progress}%` }}>
                  <div className="cp-progressthumb" style={{ transform: `translateY(-50%) scale(${progHover ? 1 : 0})` }} />
                </div>
              </div>
            </div>

            <div className="cp-bottomrow">
              <CtrlButton onClick={togglePlay} title={playing ? 'Пауза' : 'Відтворити'}>
                <Icon d={playing ? ICONS.pause : ICONS.play} size={18} />
              </CtrlButton>

              <CtrlButton onClick={toggleMute} title={muted ? 'Увімкнути звук' : 'Вимкнути звук'}>
                <Icon d={muted || volume === 0 ? ICONS.volOff : ICONS.volOn} size={18} />
              </CtrlButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={changeVolume}
                className="cp-vol"
                aria-label="Гучність"
              />

              <span className="cp-time">{fmt(currentTime)} / {fmt(duration)}</span>
              <div className="cp-spacer" />

              <CtrlButton onClick={toggleFullscreen} title="На весь екран">
                <Icon d={fullscreen ? ICONS.compress : ICONS.expand} size={18} />
              </CtrlButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function YouTubePlayer({ src, title }) {
  const embed = toEmbedUrl(src);
  return (
    <div className="cp-outer">
      {title && (
        <div className="cp-titlebar">
          <span className="cp-titletext">{title}</span>
          <span className="cp-ytbadge">YT</span>
        </div>
      )}
      <div className="cp-ratio">
        <iframe
          src={embed}
          className="cp-media"
          title={title || 'YouTube video'}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      <p className="cp-ytnote">YouTube embed - керування вбудоване в плеєр</p>
    </div>
  );
}

function EmptyPlayer() {
  return (
    <div className="cp-outer">
      <div className="cp-ratio">
        <div className="cp-media cp-empty">
          <Icon d={ICONS.video} size={42} />
          <span>Відеоджерело не вказано</span>
        </div>
      </div>
    </div>
  );
}

export default function CustomPlayer({ src, poster, title }) {
  if (!src) return <EmptyPlayer />;
  if (isYouTubeUrl(src)) return <YouTubePlayer src={src} title={title} />;
  return <HTML5Player src={src} poster={poster} title={title} />;
}