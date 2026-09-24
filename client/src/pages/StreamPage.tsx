import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Code2, AlertCircle, Copy, Check, Share2, Eye, EyeOff } from 'lucide-react';
import { VideoPlayer } from '../components/VideoPlayer';
import { CodeEditor } from '../components/CodeEditor';
import { ChallengePanel } from '../components/ChallengePanel';
import { ResultsPanel } from '../components/ResultsPanel';
import { Leaderboard } from '../components/Leaderboard';
import { InstructorChallengeView } from '../components/InstructorChallengeView';
import { CreateChallengeModal } from '../components/CreateChallengeModal';
import { FloatingReactionsOverlay, ReactionBar, type ReactionParticle } from '../components/LiveReactions';
import { useSocket } from '../hooks/useSocket';
import { useStreamState } from '../hooks/useStreamState';
import {
  getStoredUser,
  getStream,
  submitCode,
  runCode,
  triggerChallenge,
  endChallenge,
  listChallenges,
  goLive,
  endStream as endStreamApi,
  sendChatMessage,
  getStreamEvents,
} from '../lib/api';

/**
 * Stream page — split layout with video+chat (left) and workspace (right).
 * Matches the prototype's StreamView.
 */
export function StreamPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const user = getStoredUser();
  const isInstructorRole = user?.role === 'INSTRUCTOR';
  const { state, dispatch, handleServerEvent, setSubmissionResult } = useStreamState();

  // Floating live reactions state
  const [particles, setParticles] = useState<ReactionParticle[]>([]);

  // Clipboard copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  const addReactionParticle = useCallback((emoji: string) => {
    const newParticle: ReactionParticle = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      emoji,
      x: Math.floor(Math.random() * 28) + 66, // 66% - 94% on bottom-right of video
      size: Math.floor(Math.random() * 8) + 24, // 24px - 32px
      duration: Math.random() * 0.4 + 1.8, // 1.8s - 2.2s
      drift: (Math.random() - 0.5) * 40,
    };

    setParticles((prev) => [...prev.slice(-25), newParticle]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 2200);
  }, []);

  const handleSocketEvent = useCallback(
    (event: any) => {
      if (event.type === 'stream_reaction' && event.emoji) {
        addReactionParticle(event.emoji);
        return;
      }
      handleServerEvent(event);
    },
    [addReactionParticle, handleServerEvent]
  );

  const { connected, reconnecting, emit } = useSocket({
    streamId: streamId || '',
    onEvent: handleSocketEvent,
    enabled: !!streamId,
  });

  const handleSendReaction = useCallback(
    (emoji: string) => {
      addReactionParticle(emoji);
      emit('send_reaction', { emoji });
    },
    [addReactionParticle, emit]
  );

  const handleCopy = useCallback(async (text: string, fieldName: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => {
        setCopiedField((prev) => (prev === fieldName ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }, []);

  const [streamInfo, setStreamInfo] = useState<any>(null);

  // An instructor is only treated as stream owner if they created this stream's course.
  // Other instructors viewing this stream are treated as normal viewers.
  const isStreamOwner = Boolean(
    isInstructorRole && (
      streamInfo?.isOwner === true ||
      streamInfo?.course?.instructor?.id === user?.id ||
      streamInfo?.instructorId === user?.id
    )
  );

  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [viewerTab, setViewerTab] = useState<'my-code' | 'solution'>('my-code');
  const [recentSessionId, setRecentSessionId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [hlsUrlInput, setHlsUrlInput] = useState('');

  // Loading states
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [goLiveError, setGoLiveError] = useState<string | null>(null);
  const [isEndingStream, setIsEndingStream] = useState(false);
  const [pushingChallengeId, setPushingChallengeId] = useState<string | null>(null);
  const [isEndingChallenge, setIsEndingChallenge] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // VOD State
  const [vodEvents, setVodEvents] = useState<any[]>([]);
  const [videoTime, setVideoTime] = useState(0);
  const [isVod, setIsVod] = useState(false);

  // Load stream info and challenges
  useEffect(() => {
    if (!streamId) return;
    getStream(streamId).then((stream) => {
      setStreamInfo(stream);
      const ended = stream.status.toLowerCase() === 'ended';
      
      if (ended && stream.vodUrl) {
        setIsVod(true);
        // Load historical events for VOD
        getStreamEvents(streamId).then(setVodEvents).catch(console.error);
        
        // Initialize state to ENDED with the VOD URL
        dispatch({
          type: 'SESSION_SNAPSHOT',
          payload: { status: 'ended', hlsUrl: stream.vodUrl, viewerCount: 0 }
        });
      } else if (stream?.streamKey && !hlsUrlInput) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        setHlsUrlInput(isLocal ? `http://localhost:8080/hls/${stream.streamKey}.m3u8` : `${window.location.origin}/hls/${stream.streamKey}.m3u8`);
      }
    }).catch(console.error);
  }, [streamId, dispatch]);

  useEffect(() => {
    if (streamInfo?.course?.id) {
      listChallenges(streamInfo.course.id).then(setChallenges).catch(console.error);
    }
  }, [streamInfo?.course?.id]);

  // Reset submit count when a new challenge starts
  useEffect(() => {
    if (state.currentChallenge?.sessionId) {
      setRecentSessionId(state.currentChallenge.sessionId);
      setSubmitCount(0);
    }
  }, [state.currentChallenge?.sessionId]);

  // Set starter code when challenge starts
  useEffect(() => {
    if (state.currentChallenge?.starterCode && !code) {
      setCode(state.currentChallenge.starterCode);
    }
  }, [state.currentChallenge?.starterCode]);

  // VOD Replay Effect
  useEffect(() => {
    if (isVod && streamInfo?.startedAt && vodEvents.length > 0) {
      const streamStartedAt = new Date(streamInfo.startedAt).getTime();
      dispatch({
        type: 'RESET_AND_REPLAY',
        payload: {
          events: vodEvents,
          targetTime: videoTime,
          streamStartedAt,
        }
      });
    }
  }, [isVod, videoTime, vodEvents, streamInfo?.startedAt, dispatch]);

  // ─── Handlers ────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    if (!state.currentChallenge || !streamId || running) return;
    setRunning(true);
    try {
      const result = await runCode(
        code,
        state.currentChallenge.language,
        state.currentChallenge.sessionId
      );
      // Show results without marking as submitted
      setSubmissionResult({
        id: 'run-preview',
        status: 'executed',
        testResults: result.testResults,
        aiHint: null,
        executionTimeMs: result.executionTimeMs,
      });
    } catch (err: any) {
      console.error('Run failed:', err);
    } finally {
      setRunning(false);
    }
  }, [code, state.currentChallenge, streamId, running, setSubmissionResult]);

  const handleSubmit = useCallback(async () => {
    if (!state.currentChallenge || !streamId || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitCode(
        code,
        state.currentChallenge.language,
        state.currentChallenge.sessionId
      );
      setSubmitCount((n) => n + 1);
      setSubmissionResult({
        id: result.submissionId,
        status: 'executed',
        testResults: result.testResults,
        aiHint: null,
        executionTimeMs: result.executionTimeMs,
      });
    } catch (err: any) {
      console.error('Submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [code, state.currentChallenge, streamId, submitting, setSubmissionResult]);

  const handleTriggerChallenge = useCallback(async (challengeId: string, durationSeconds: number = 120) => {
    if (!streamId) return;
    setPushingChallengeId(challengeId);
    try {
      await triggerChallenge(streamId, challengeId, durationSeconds);
    } catch (err) {
      console.error('Trigger failed:', err);
    } finally {
      setPushingChallengeId(null);
    }
  }, [streamId]);

  const handleEndChallenge = useCallback(async () => {
    if (!streamId) return;
    setIsEndingChallenge(true);
    try {
      await endChallenge(streamId);
    } catch (err) {
      console.error('End challenge failed:', err);
    } finally {
      setIsEndingChallenge(false);
    }
  }, [streamId]);

  const handleGoLive = useCallback(async () => {
    if (!streamId) return;
    setIsGoingLive(true);
    setGoLiveError(null);
    try {
      await goLive(streamId, hlsUrlInput);
      const updated = await getStream(streamId);
      setStreamInfo(updated);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to go live.';
      setGoLiveError(errorMessage);
      console.error('Go live failed:', err);
    } finally {
      setIsGoingLive(false);
    }
  }, [streamId, hlsUrlInput]);

  const handleEndStream = useCallback(async () => {
    if (!streamId) return;
    setIsEndingStream(true);
    try {
      await endStreamApi(streamId);
      navigate('/');
    } catch (err) {
      console.error('End stream failed:', err);
      setIsEndingStream(false);
    }
  }, [streamId, navigate]);

  const handleSendChat = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamId || !chatInput.trim() || isSendingChat) return;
    
    setIsSendingChat(true);
    try {
      await sendChatMessage(streamId, chatInput);
      setChatInput('');
    } catch (err) {
      console.error('Send chat failed:', err);
    } finally {
      setIsSendingChat(false);
    }
  }, [streamId, chatInput, isSendingChat]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* ─── Left Pane: Video & Chat (40%) ────────────── */}
      <div style={{
        width: '40%',
        minWidth: 360,
        borderRight: '1px solid var(--gray-800)',
        display: 'flex',
        flexDirection: 'column',
        background: 'black',
      }}>
        {/* Video Player with Live Floating Reactions */}
        <VideoPlayer 
          hlsUrl={state.hlsUrl} 
          isLive={state.status === 'live'} 
          onTimeUpdate={isVod ? setVideoTime : undefined} 
        >
          <FloatingReactionsOverlay particles={particles} />
        </VideoPlayer>

        {/* Chat & Instructor Controls */}
        <div style={{
          flex: 1,
          background: 'var(--gray-950)',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          minHeight: 0,
        }}>
          {/* Chat header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 8,
            borderBottom: '1px solid var(--gray-800)',
            marginBottom: 12,
          }}>
            <h3 style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
            }}>
              Stream Chat
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              {/* Share stream button */}
              <button
                type="button"
                onClick={() => handleCopy(window.location.href, 'share')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: copiedField === 'share' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  color: copiedField === 'share' ? '#4ade80' : 'var(--gray-400)',
                  border: `1px solid ${copiedField === 'share' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Copy shareable stream link"
              >
                {copiedField === 'share' ? <Check size={11} /> : <Share2 size={11} />}
                <span>{copiedField === 'share' ? 'Copied Link!' : 'Share'}</span>
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--gray-500)',
              }}>
                <Users size={14} />
                {state.viewerCount}
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div className="scrollbar-hide" style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontSize: 14,
          }}>
            {state.chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 13, marginTop: 20 }}>
                No messages yet. Say hello!
              </div>
            ) : (
              state.chatMessages.map(msg => (
                <ChatMessage 
                  key={msg.id} 
                  user={msg.user} 
                  msg={msg.message} 
                  isInstructor={msg.isInstructor}
                  isMe={msg.userId ? msg.userId === user?.id : msg.user === (user?.displayName || user?.email.split('@')[0])}
                />
              ))
            )}

            {/* Reconnection indicator */}
            {reconnecting && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--yellow-400)',
                textAlign: 'center',
              }}>
                Reconnecting...
              </div>
            )}

            {/* Instructor Controls (only visible to stream owner) */}
            {isStreamOwner && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: 'var(--indigo-900-20)',
                border: '1px solid var(--indigo-500-30)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <p style={{
                  fontSize: 11,
                  color: 'var(--indigo-400)',
                  fontFamily: 'var(--font-mono)',
                  margin: 0,
                }}>
                  INSTRUCTOR CONTROLS
                </p>

                {/* Go Live / End Stream */}
                {streamInfo?.status !== 'LIVE' ? (
                  <>
                    <div style={{
                      background: 'var(--gray-900)',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--gray-800)',
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}>
                      {/* RTMP Server */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-400)', fontWeight: 500, fontSize: 11 }}>RTMP Server URL:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`rtmp://${window.location.hostname}/live`, 'rtmp')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              background: copiedField === 'rtmp' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              border: `1px solid ${copiedField === 'rtmp' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                              color: copiedField === 'rtmp' ? '#4ade80' : 'var(--gray-300)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {copiedField === 'rtmp' ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedField === 'rtmp' ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--gray-300)',
                          background: 'var(--gray-950)',
                          padding: '6px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          border: '1px solid var(--gray-800)',
                          userSelect: 'all',
                        }}>
                          {`rtmp://${window.location.hostname}/live`}
                        </div>
                      </div>

                      {/* Stream Key */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-400)', fontWeight: 500, fontSize: 11 }}>Stream Key:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setIsKeyVisible(!isKeyVisible)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--gray-300)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                              title={isKeyVisible ? 'Hide stream key' : 'Show stream key'}
                            >
                              {isKeyVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                              <span>{isKeyVisible ? 'Hide' : 'Show'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(streamInfo?.streamKey || '', 'key')}
                              disabled={!streamInfo?.streamKey}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: copiedField === 'key' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                border: `1px solid ${copiedField === 'key' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                                color: copiedField === 'key' ? '#4ade80' : 'var(--indigo-300)',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: !streamInfo?.streamKey ? 'not-allowed' : 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {copiedField === 'key' ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copiedField === 'key' ? 'Copied Key!' : 'Copy Key'}</span>
                            </button>
                          </div>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--indigo-400)',
                          background: 'var(--gray-950)',
                          padding: '6px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          border: '1px solid var(--gray-800)',
                          wordBreak: 'break-all',
                          userSelect: 'all',
                        }}>
                          {streamInfo?.streamKey
                            ? isKeyVisible
                              ? streamInfo.streamKey
                              : '••••••••••••••••••••••••••••••••'
                            : 'Loading stream key...'}
                        </div>
                      </div>

                      {/* HLS Playback URL */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-400)', fontWeight: 500, fontSize: 11 }}>HLS Playback URL:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(hlsUrlInput, 'hls')}
                            disabled={!hlsUrlInput}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              background: copiedField === 'hls' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              border: `1px solid ${copiedField === 'hls' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                              color: copiedField === 'hls' ? '#4ade80' : 'var(--gray-300)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: !hlsUrlInput ? 'not-allowed' : 'pointer',
                              opacity: !hlsUrlInput ? 0.5 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {copiedField === 'hls' ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedField === 'hls' ? 'Copied URL!' : 'Copy URL'}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="https://.../index.m3u8"
                          value={hlsUrlInput}
                          onChange={(e) => setHlsUrlInput(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: 'var(--gray-950)',
                            border: '1px solid var(--gray-800)',
                            borderRadius: 4,
                            color: 'var(--gray-300)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleGoLive}
                      disabled={isGoingLive}
                      style={{
                        background: isGoingLive ? 'var(--gray-700)' : 'var(--green-500)',
                        color: 'white',
                        padding: '8px 0',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        boxShadow: isGoingLive ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.2)',
                        cursor: isGoingLive ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        marginTop: 4,
                      }}
                    >
                      {isGoingLive ? '⏳ Going Live...' : '🔴 Go Live'}
                    </button>
                    {goLiveError && (
                      <div style={{
                        marginTop: 8,
                        padding: '8px 10px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 6,
                        color: 'var(--red-400)',
                        fontSize: 12,
                        lineHeight: 1.4,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                      }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{goLiveError}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleEndStream}
                    disabled={isEndingStream}
                    style={{
                      background: 'var(--red-500-10)',
                      border: '1px solid var(--red-500-30)',
                      color: 'var(--red-400)',
                      padding: '8px 0',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      opacity: isEndingStream ? 0.5 : 1,
                      cursor: isEndingStream ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isEndingStream ? 'Ending...' : 'End Stream'}
                  </button>
                )}

                {/* Challenge triggers */}
                {state.currentChallenge ? (
                  <button
                    onClick={handleEndChallenge}
                    disabled={isEndingChallenge}
                    style={{
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      color: 'var(--yellow-400)',
                      padding: '8px 0',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      opacity: isEndingChallenge ? 0.5 : 1,
                      cursor: isEndingChallenge ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isEndingChallenge ? 'Ending...' : '🏁 End Challenge'}
                  </button>
                ) : (
                  <>
                    {recentSessionId && (
                      <button
                        onClick={() => setShowLeaderboard(true)}
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: 'var(--indigo-300)',
                          padding: '8px 0',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: 'pointer',
                          marginBottom: 8,
                        }}
                      >
                        🏆 View Last Leaderboard
                      </button>
                    )}
                    {challenges.map((ch) => {
                      const isPushing = pushingChallengeId === ch.id;
                      const duration = ch.config?.durationSeconds || 120;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => handleTriggerChallenge(ch.id, duration)}
                          disabled={pushingChallengeId !== null}
                          style={{
                            background: isPushing ? 'var(--indigo-800)' : 'var(--indigo-600)',
                            color: 'white',
                            padding: '8px 0',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: isPushing ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.2)',
                            opacity: pushingChallengeId !== null && !isPushing ? 0.5 : 1,
                            cursor: pushingChallengeId !== null ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <Code2 size={16} />
                          {isPushing ? 'Pushing...' : ch.title}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setShowCreateModal(true)}
                      style={{
                        background: 'transparent',
                        color: 'var(--indigo-400)',
                        border: '1px dashed var(--indigo-500-30)',
                        padding: '8px 0',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        marginTop: 4,
                      }}
                    >
                      + Create Custom Challenge
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Live Reactions Bar */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <ReactionBar onSendReaction={handleSendReaction} disabled={!connected} />
          </div>

          {/* Chat input */}
          <div style={{ marginTop: 10 }}>
            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Send a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isSendingChat || !connected}
                style={{
                  flex: 1,
                  background: 'var(--gray-900)',
                  border: '1px solid var(--gray-800)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 14,
                  color: 'var(--gray-300)',
                  opacity: (isSendingChat || !connected) ? 0.5 : 1,
                }}
              />
              <button
                type="submit"
                disabled={isSendingChat || !connected || !chatInput.trim()}
                style={{
                  background: 'var(--indigo-600)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 16px',
                  cursor: (isSendingChat || !connected || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isSendingChat || !connected || !chatInput.trim()) ? 0.5 : 1,
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ─── Right Pane: Interactive Workspace (60%) ──── */}
      <div style={{
        flex: 1,
        background: 'var(--gray-950)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
      }}>
        {/* ── INSTRUCTOR (Stream Owner only): active challenge → show InstructorChallengeView ── */}
        {isStreamOwner && state.currentChallenge ? (
          <InstructorChallengeView
            streamId={streamId!}
            challenge={{
              ...state.currentChallenge!,
              testCases: state.currentChallenge!.sampleTestCases,
            }}
            serverTimeOffset={state.serverTimeOffset}
            onEndChallenge={handleEndChallenge}
            isEndingChallenge={isEndingChallenge}
          />

        /* ── INSTRUCTOR or VIEWER: no challenge, show leaderboard if requested ── */
        ) : showLeaderboard && (state.currentChallenge?.sessionId || recentSessionId) ? (
          <Leaderboard
            sessionId={state.currentChallenge?.sessionId || recentSessionId || ''}
            onBack={() => setShowLeaderboard(false)}
          />

        /* ── No active challenge: idle state ── */
        ) : !state.currentChallenge ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 32,
            opacity: 0.6,
          }}>
            <Code2 size={48} style={{ color: 'var(--gray-700)', marginBottom: 16 }} />
            <h2 style={{
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--gray-400)',
              margin: '0 0 8px 0',
            }}>
              Workspace Idle
            </h2>
            <p style={{
              fontSize: 14,
              color: 'var(--gray-500)',
              maxWidth: 400,
              margin: 0,
            }}>
              When the instructor starts a coding challenge, your interactive editor will appear here instantly.
            </p>

            {/* Connection status */}
            <div style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: connected ? 'var(--green-400)' : 'var(--gray-500)',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: connected ? 'var(--green-500)' : 'var(--gray-600)',
              }} />
              {connected ? 'Connected' : 'Connecting...'}
            </div>

            {/* View Last Leaderboard (for viewers and instructors after challenge ends) */}
            {recentSessionId && (
              <button
                onClick={() => setShowLeaderboard(true)}
                style={{
                  marginTop: 24,
                  background: 'var(--indigo-600)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                🏆 View Last Leaderboard
              </button>
            )}
          </div>

        /* ── VIEWER: active challenge → show editor stack ── */
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            animation: 'fadeInScale 0.3s var(--ease-out)',
          }}>
            <ChallengePanel
              challenge={state.currentChallenge!}
              serverTimeOffset={state.serverTimeOffset}
              isRunning={running}
              isSubmitting={submitting}
              hasSubmitted={submitCount > 0}
              submitCount={submitCount}
              virtualNow={isVod && streamInfo?.startedAt ? new Date(streamInfo.startedAt).getTime() + videoTime * 1000 : undefined}
              onRun={handleRun}
              onSubmit={handleSubmit}
            />

            {state.currentChallenge!.solutionCode && (
              <div style={{ display: 'flex', background: 'var(--gray-900)', borderBottom: '1px solid var(--gray-800)', flexShrink: 0 }}>
                <button
                  onClick={() => setViewerTab('my-code')}
                  style={{ padding: '10px 20px', fontSize: 13, fontWeight: viewerTab === 'my-code' ? 600 : 400, color: viewerTab === 'my-code' ? 'var(--text-main)' : 'var(--gray-500)', borderBottom: viewerTab === 'my-code' ? '2px solid var(--indigo-500)' : '2px solid transparent', background: 'transparent', cursor: 'pointer' }}
                >
                  My Code
                </button>
                <button
                  onClick={() => setViewerTab('solution')}
                  style={{ padding: '10px 20px', fontSize: 13, fontWeight: viewerTab === 'solution' ? 600 : 400, color: viewerTab === 'solution' ? 'var(--green-400)' : 'var(--gray-500)', borderBottom: viewerTab === 'solution' ? '2px solid var(--green-500)' : '2px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Code2 size={14} /> Instructor Solution
                </button>
              </div>
            )}

            {viewerTab === 'my-code' || !state.currentChallenge!.solutionCode ? (
              <>
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <CodeEditor
                    code={code}
                    onChange={setCode}
                    language={state.currentChallenge!.language}
                    disabled={false}
                    isEvaluating={running || submitting}
                  />
                </div>
                <ResultsPanel
                  submission={state.mySubmission}
                  onViewLeaderboard={() => setShowLeaderboard(true)}
                />
              </>
            ) : (
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <CodeEditor
                  code={state.currentChallenge!.solutionCode!}
                  onChange={() => {}}
                  language={state.currentChallenge!.language}
                  disabled={true}
                  isEvaluating={false}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && streamInfo?.course?.id && (
        <CreateChallengeModal
          courseId={streamInfo.course.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newChallenge) => {
            setChallenges((prev) => [newChallenge, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

/** Chat message component */
function ChatMessage({ user, msg, isInstructor, isMe }: {
  user: string;
  msg: string;
  isInstructor?: boolean;
  isMe?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end',
    }}>
      {/* Avatar for others (left side) */}
      {!isMe && (
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
          background: isInstructor ? 'var(--indigo-600)' : 'var(--gray-800)',
          color: isInstructor ? 'var(--text-main)' : 'var(--gray-300)',
        }}>
          {user.substring(0, 2).toUpperCase()}
        </div>
      )}

      {/* Message Bubble */}
      <div style={{
        maxWidth: '85%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
      }}>
        {/* Name and Tags (only show if not me, or if instructor) */}
        {(!isMe || isInstructor) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {!isMe && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: isInstructor ? 'var(--indigo-400)' : 'var(--gray-400)',
              }}>
                {user}
              </span>
            )}
            {isInstructor && (
              <span style={{
                background: 'var(--indigo-500-20)',
                color: 'var(--indigo-400)',
                fontSize: 9,
                textTransform: 'uppercase',
                padding: '1px 4px',
                borderRadius: 2,
                border: '1px solid var(--indigo-500-30)',
                fontWeight: 700,
              }}>
                Instructor
              </span>
            )}
          </div>
        )}

        {/* The Text */}
        <div style={{
          background: isMe ? 'var(--indigo-600)' : 'var(--gray-800)',
          color: isMe ? 'white' : 'var(--gray-200)',
          padding: '8px 12px',
          borderRadius: 12,
          borderBottomRightRadius: isMe ? 2 : 12,
          borderBottomLeftRadius: !isMe ? 2 : 12,
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: 'break-word',
          border: isMe ? '1px solid var(--indigo-500)' : '1px solid var(--gray-700)',
        }}>
          {msg}
        </div>
      </div>
    </div>
  );
}
