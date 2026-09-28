import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Settings, Maximize, Minimize, Volume2, VolumeX, Check } from 'lucide-react';

interface VideoPlayerProps {
  hlsUrl: string | null;
  isLive?: boolean;
  streamEnded?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  children?: React.ReactNode;
}

interface QualityLevel {
  index: number;
  label: string;
  height: number;
  bitrate: number;
}

/**
 * HLS.js video player component with full controls:
 * - Play/Pause toggle
 * - Mute/Unmute toggle
 * - Fullscreen toggle
 * - Quality selector (Auto + available HLS levels)
 */
export function VideoPlayer({ hlsUrl, isLive = false, streamEnded = false, onTimeUpdate, children }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoState, setVideoState] = useState<'loading' | 'buffering' | 'playing' | 'autoplay-blocked' | 'error'>('loading');
  const [videoError, setVideoError] = useState<string | null>(null);

  // ─── HLS Setup ──────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Automatically resolve localhost:8080 URLs to the current domain when deployed
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const effectiveUrl = (!isLocal && hlsUrl.includes('localhost:8080/hls/'))
      ? hlsUrl.replace(/http:\/\/localhost:8080\/hls\//, `${window.location.origin}/hls/`)
      : hlsUrl;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        // Build quality level list
        const levels: QualityLevel[] = data.levels.map((level: any, index: number) => ({
          index,
          label: level.height ? `${level.height}p` : `Level ${index + 1}`,
          height: level.height || 0,
          bitrate: level.bitrate || 0,
        }));

        // Sort by height descending (1080p first)
        levels.sort((a, b) => b.height - a.height);
        setQualities(levels);
        setVideoState('buffering');

        video.play().then(() => {
          setVideoState('playing');
        }).catch((err) => {
          console.warn('Autoplay blocked:', err.message);
          setVideoState('autoplay-blocked');
        });
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (videoState === 'buffering' || videoState === 'loading') {
          setVideoState('playing');
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        // Update current quality display when HLS auto-switches
        if (hls.autoLevelEnabled) {
          setCurrentQuality(-1);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('HLS Network Error, attempting to recover...', data);
              setVideoState('buffering');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('HLS Media Error, attempting to recover...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS Fatal Error, destroying player', data);
              setVideoState('error');
              setVideoError(`${data.type}: ${data.details}`);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = effectiveUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }
  }, [hlsUrl]);

  // ─── Video event listeners ──────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onTimeUpdate]);

  // ─── Fullscreen change listener ─────────────────────────
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // ─── Control Handlers ───────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => {
        setVideoState('playing');
      }).catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  const selectQuality = useCallback((levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (levelIndex === -1) {
      // Auto
      hls.currentLevel = -1;
    } else {
      hls.currentLevel = levelIndex;
    }
    setCurrentQuality(levelIndex);
    setShowQualityMenu(false);
  }, []);

  // ─── Controls visibility ───────────────────────────────
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
      setShowQualityMenu(false);
    }, 3000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowControls(false);
    setShowQualityMenu(false);
  }, []);

  // Format bitrate for display
  const formatBitrate = (bitrate: number): string => {
    if (bitrate >= 1000000) return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    if (bitrate >= 1000) return `${Math.round(bitrate / 1000)} Kbps`;
    return `${bitrate} bps`;
  };

  // ─── Placeholder (no stream) ────────────────────────────
  if (!hlsUrl) {
    return (
      <div style={{
        aspectRatio: '16/9',
        background: 'var(--gray-900)',
        position: 'relative',
        borderBottom: '1px solid var(--gray-800)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: streamEnded
            ? 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 50%, #1a1a2e 100%)'
            : 'linear-gradient(135deg, var(--gray-900) 0%, #1a1a2e 50%, var(--gray-900) 100%)',
          opacity: 0.8,
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          zIndex: 1,
        }}>
          {streamEnded ? (
            <>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Pause size={28} style={{ color: '#ef4444' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--gray-300)', fontSize: 16, fontWeight: 600 }}>
                  Stream Has Ended
                </p>
                <p style={{ color: 'var(--gray-500)', fontSize: 13, marginTop: 4 }}>
                  The instructor has ended this live session
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--indigo-500-10)',
                border: '2px solid var(--indigo-500-30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Play size={28} style={{ color: 'var(--indigo-400)', marginLeft: 3 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--gray-400)', fontSize: 15, fontWeight: 500 }}>
                  {isLive ? 'Connecting to stream...' : 'Stream Preview'}
                </p>
                <p style={{ color: 'var(--gray-600)', fontSize: 13, marginTop: 4 }}>
                  {isLive ? 'The live stream will appear here' : 'Waiting for instructor to go live'}
                </p>
              </div>
            </>
          )}
        </div>

        {isLive && (
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
            <span className="live-badge"><span className="dot" />LIVE</span>
          </div>
        )}
      </div>
    );
  }

  // ─── Active Stream Player ──────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        aspectRatio: isFullscreen ? undefined : '16/9',
        width: isFullscreen ? '100%' : undefined,
        height: isFullscreen ? '100%' : undefined,
        background: 'black',
        position: 'relative',
        borderBottom: isFullscreen ? 'none' : '1px solid var(--gray-800)',
        cursor: showControls ? 'default' : 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: isFullscreen ? 'contain' : 'cover',
        }}
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* LIVE Badge */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 3,
        opacity: showControls ? 1 : 0.6,
        transition: 'opacity 0.3s',
      }}>
        <span className="live-badge"><span className="dot" />LIVE</span>
      </div>

      {/* Video state overlays */}
      {(videoState === 'loading' || videoState === 'buffering') && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          zIndex: 4,
          gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: 'var(--indigo-400)', borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span style={{ color: 'var(--gray-300)', fontSize: 14 }}>
            {videoState === 'loading' ? 'Connecting to stream...' : 'Buffering...'}
          </span>
        </div>
      )}

      {videoState === 'autoplay-blocked' && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 4,
            cursor: 'pointer',
            gap: 12,
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--indigo-500)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(99,102,241,0.4)',
          }}>
            <Play size={28} style={{ color: '#fff', marginLeft: 3 }} />
          </div>
          <span style={{ color: 'var(--gray-200)', fontSize: 15, fontWeight: 500 }}>Click to play</span>
        </div>
      )}

      {videoState === 'error' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          zIndex: 4,
          gap: 8,
        }}>
          <span style={{ color: 'var(--red-400)', fontSize: 15, fontWeight: 600 }}>Stream Error</span>
          <span style={{ color: 'var(--gray-400)', fontSize: 13 }}>{videoError}</span>
        </div>
      )}

      {/* Bottom Controls Overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4), transparent)',
        padding: '40px 16px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: showControls ? 1 : 0,
        transition: 'opacity 0.3s',
        zIndex: 2,
      }}>
        {/* Left Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              background: 'none',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 4,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={toggleMute}
            style={{
              background: 'none',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 4,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Live indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'white',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulse 2s infinite',
            }} />
            Live
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          {/* Quality / Settings */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQualityMenu(!showQualityMenu);
              }}
              style={{
                background: 'none',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: 4,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              title="Quality Settings"
            >
              <Settings size={18} />
            </button>

            {/* Quality dropdown menu */}
            {showQualityMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: 8,
                  background: 'rgba(20, 20, 30, 0.95)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '6px 0',
                  minWidth: 200,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  zIndex: 100,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  padding: '8px 16px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Quality
                </div>

                {/* Auto option */}
                <button
                  onClick={() => selectQuality(-1)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: currentQuality === -1 ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    color: currentQuality === -1 ? 'var(--indigo-400)' : 'var(--gray-300)',
                    fontSize: 14,
                    fontWeight: currentQuality === -1 ? 600 : 400,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { if (currentQuality !== -1) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { if (currentQuality !== -1) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>Auto</span>
                  {currentQuality === -1 && <Check size={16} />}
                </button>

                {/* Divider */}
                {qualities.length > 0 && (
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 12px' }} />
                )}

                {/* Quality levels */}
                {qualities.map((q) => (
                  <button
                    key={q.index}
                    onClick={() => selectQuality(q.index)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: currentQuality === q.index ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: currentQuality === q.index ? 'var(--indigo-400)' : 'var(--gray-300)',
                      fontSize: 14,
                      fontWeight: currentQuality === q.index ? 600 : 400,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (currentQuality !== q.index) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { if (currentQuality !== q.index) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{q.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {formatBitrate(q.bitrate)}
                      </span>
                      {currentQuality === q.index && <Check size={16} />}
                    </div>
                  </button>
                ))}

                {/* Show message if only 1 quality */}
                {qualities.length <= 1 && (
                  <div style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    color: 'var(--gray-500)',
                    fontStyle: 'italic',
                  }}>
                    Only source quality available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'none',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 4,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
