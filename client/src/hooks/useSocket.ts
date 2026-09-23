import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/api';

const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;

interface UseSocketOptions {
  streamId: string;
  onEvent?: (event: any) => void;
  enabled?: boolean;
}

/**
 * Socket.IO client hook.
 * Manages connection lifecycle, authentication, and event listening.
 * Implements §6.3 connection lifecycle.
 */
export function useSocket({ streamId, onEvent, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!enabled || !streamId) return;

    const token = getToken();
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      query: { streamId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setConnected(true);
      setReconnecting(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setConnected(false);
      if (reason !== 'io client disconnect') {
        setReconnecting(true);
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnecting (attempt ${attempt})...`);
      setReconnecting(true);
    });

    socket.on('reconnect', () => {
      console.log('✅ Reconnected');
      setReconnecting(false);
      // Request fresh state snapshot on reconnect (MVP — no event replay)
      socket.emit('reconnect_request', {});
    });

    socket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err.message);
    });

    const eventTypes = [
      'session_snapshot',
      'challenge_start',
      'challenge_end',
      'submission_ack',
      'hint_ready',
      'leaderboard_update',
      'viewer_count_update',
      'stream_end',
      'chat_message',
      'event_replay',
      'stream_reaction',
    ];

    for (const type of eventTypes) {
      socket.on(type, (event: any) => {
        onEvent?.({ ...event, type });
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, connected, reconnecting, emit };
}
