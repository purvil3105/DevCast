import { useReducer, useCallback } from 'react';

/**
 * Stream state model — implements §6.3 React State Model exactly.
 */
export interface ActiveChallenge {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  language: string;
  durationSeconds: number;
  startedAt: number; // UTC ms
  sessionId: string;
  solutionCode?: string;
  sampleTestCases?: Array<{
    input: string;
    expected_output: string;
    description?: string;
  }>;
}

export interface MySubmission {
  id: string;
  status: string;
  testResults: {
    passed: number;
    total: number;
    cases: Array<{
      passed: boolean;
      actual?: any;
      expected?: any;
      error?: string;
      description?: string;
    }>;
    error?: string;
  } | null;
  aiHint: string | null;
  executionTimeMs?: number;
}

export interface ChatMessage {
  id: string;
  userId?: string;
  user: string;
  message: string;
  isInstructor?: boolean;
  timestamp: number;
}

export interface StreamState {
  status: 'connecting' | 'live' | 'ended' | 'error';
  hlsUrl: string | null;
  currentChallenge: ActiveChallenge | null;
  mySubmission: MySubmission | null;
  viewerCount: number;
  lastSeq: number;
  serverTimeOffset: number; // ms difference: serverTime - clientTime
  chatMessages: ChatMessage[];
}

type StreamAction =
  | { type: 'SESSION_SNAPSHOT'; payload: any }
  | { type: 'CHALLENGE_START'; payload: any }
  | { type: 'CHALLENGE_END'; payload: any }
  | { type: 'SUBMISSION_RESULT'; payload: MySubmission }
  | { type: 'HINT_READY'; payload: { submissionId: string; hint: string } }
  | { type: 'VIEWER_COUNT_UPDATE'; payload: { count: number } }
  | { type: 'STREAM_END' }
  | { type: 'SOLUTION_REVEAL'; payload: { code: string } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_SUBMISSION' }
  | { type: 'CHAT_MESSAGE'; payload: any }
  | { type: 'EVENT_REPLAY'; payload: any }
  | { type: 'RESET_AND_REPLAY'; payload: { events: any[]; targetTime: number; streamStartedAt: number } };

const initialState: StreamState = {
  status: 'connecting',
  hlsUrl: null,
  currentChallenge: null,
  mySubmission: null,
  viewerCount: 0,
  lastSeq: 0,
  serverTimeOffset: 0,
  chatMessages: [],
};

function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case 'SESSION_SNAPSHOT': {
      const { hlsUrl, status, viewerCount, currentChallenge, mySubmission } = action.payload.payload || action.payload;
      const seq = action.payload.seq ?? state.lastSeq;
      const serverTime = action.payload.serverTime ?? Date.now();

      return {
        ...state,
        status: status === 'live' ? 'live' : status === 'ended' ? 'ended' : state.status,
        hlsUrl: hlsUrl || state.hlsUrl,
        viewerCount: viewerCount ?? state.viewerCount,
        currentChallenge: currentChallenge
          ? {
              id: currentChallenge.id,
              title: currentChallenge.title,
              description: currentChallenge.description,
              starterCode: currentChallenge.starterCode || '',
              language: currentChallenge.language,
              durationSeconds: currentChallenge.durationSeconds,
              startedAt: currentChallenge.startedAt,
              sessionId: currentChallenge.sessionId,
              solutionCode: currentChallenge.solutionCode,
              sampleTestCases: currentChallenge.sampleTestCases || [],
            }
          : null,
        mySubmission: mySubmission || null,
        lastSeq: seq,
        serverTimeOffset: serverTime - Date.now(),
      };
    }

    case 'CHALLENGE_START': {
      const { challenge, durationSeconds, startedAt, sessionId } = action.payload.payload || action.payload;
      return {
        ...state,
        currentChallenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          starterCode: challenge.starterCode || '',
          language: challenge.language,
          durationSeconds,
          startedAt,
          sessionId,
          sampleTestCases: challenge.sampleTestCases || [],
        },
        mySubmission: null,
        lastSeq: action.payload.seq ?? state.lastSeq,
      };
    }

    case 'CHALLENGE_END':
      return {
        ...state,
        currentChallenge: null,
        mySubmission: null,
        lastSeq: action.payload.seq ?? state.lastSeq,
      };

    case 'SUBMISSION_RESULT':
      return {
        ...state,
        mySubmission: action.payload,
      };

    case 'HINT_READY': {
      if (!state.mySubmission) return state;
      if (action.payload.submissionId !== state.mySubmission.id) return state;
      return {
        ...state,
        mySubmission: {
          ...state.mySubmission,
          aiHint: action.payload.hint,
          status: 'ai_evaluated',
        },
      };
    }

    case 'VIEWER_COUNT_UPDATE':
      return {
        ...state,
        viewerCount: action.payload.count,
      };

    case 'STREAM_END':
      return {
        ...state,
        status: 'ended',
        hlsUrl: null,
        currentChallenge: null,
      };

    case 'SOLUTION_REVEAL':
      if (!state.currentChallenge) return state;
      return {
        ...state,
        currentChallenge: {
          ...state.currentChallenge,
          solutionCode: action.payload.code ?? (action.payload as any).payload?.code,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        status: 'error',
      };

    case 'CLEAR_SUBMISSION':
      return {
        ...state,
        mySubmission: null,
      };

    case 'CHAT_MESSAGE': {
      const payload = action.payload.payload || action.payload;
      const seq = action.payload.seq;
      const serverTime = action.payload.serverTime;
      const newMsg: ChatMessage = {
        id: `${seq}-${serverTime}`,
        userId: payload.userId,
        user: payload.user,
        message: payload.message,
        isInstructor: payload.isInstructor,
        timestamp: serverTime,
      };
      // Keep last 100
      const newMessages = [...state.chatMessages, newMsg].slice(-100);
      return {
        ...state,
        chatMessages: newMessages,
        lastSeq: Math.max(state.lastSeq, seq || 0),
      };
    }

    case 'EVENT_REPLAY': {
      const events = action.payload.payload?.events || [];
      const newMessages = [...state.chatMessages];
      let maxSeq = state.lastSeq;

      for (const event of events) {
        if (event.seq > maxSeq) {
          maxSeq = event.seq;
          if (event.type === 'chat_message') {
            const payload = event.payload;
            newMessages.push({
              id: `${event.seq}-${event.serverTime}`,
              userId: payload.userId,
              user: payload.user,
              message: payload.message,
              isInstructor: payload.isInstructor,
              timestamp: event.serverTime,
            });
          }
        }
      }

      // Sort just in case, then slice
      newMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      return {
        ...state,
        chatMessages: newMessages.slice(-100),
        lastSeq: maxSeq,
      };
    }

    case 'RESET_AND_REPLAY': {
      const { events, targetTime, streamStartedAt } = action.payload;
      // Start from a clean slate
      let rebuiltState = { ...initialState, status: state.status, hlsUrl: state.hlsUrl, serverTimeOffset: 0 };
      
      const targetServerTime = streamStartedAt + targetTime * 1000;

      for (const event of events) {
        if (event.serverTime > targetServerTime) break; // Events are sorted by serverTime

        // Manually apply event logic
        switch (event.type) {
          case 'challenge_start': {
            const { challenge, durationSeconds, startedAt, sessionId } = event.payload;
            rebuiltState.currentChallenge = {
              id: challenge.id,
              title: challenge.title,
              description: challenge.description,
              starterCode: challenge.starterCode || '',
              language: challenge.language,
              durationSeconds,
              startedAt,
              sessionId,
            };
            rebuiltState.mySubmission = null;
            break;
          }
          case 'challenge_end':
          case 'stream_end':
            rebuiltState.currentChallenge = null;
            rebuiltState.mySubmission = null;
            break;
          case 'solution_reveal':
            if (rebuiltState.currentChallenge) {
              rebuiltState.currentChallenge.solutionCode = event.payload.code;
            }
            break;
          case 'chat_message': {
            const payload = event.payload;
            rebuiltState.chatMessages.push({
              id: `${event.seq}-${event.serverTime}`,
              userId: payload.userId,
              user: payload.user,
              message: payload.message,
              isInstructor: payload.isInstructor,
              timestamp: event.serverTime,
            });
            break;
          }
        }
        rebuiltState.lastSeq = Math.max(rebuiltState.lastSeq, event.seq);
      }
      
      // Keep only last 100 messages
      rebuiltState.chatMessages = rebuiltState.chatMessages.slice(-100);
      return rebuiltState;
    }

    default:
      return state;
  }
}

/**
 * Hook to manage the full stream state.
 * Handles all server events and provides action dispatchers.
 */
export function useStreamState() {
  const [state, dispatch] = useReducer(streamReducer, initialState);

  const handleServerEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'session_snapshot':
        dispatch({ type: 'SESSION_SNAPSHOT', payload: event });
        break;
      case 'challenge_start':
        dispatch({ type: 'CHALLENGE_START', payload: event });
        break;
      case 'challenge_end':
        dispatch({ type: 'CHALLENGE_END', payload: event });
        break;
      case 'hint_ready':
        dispatch({
          type: 'HINT_READY',
          payload: event.payload || event,
        });
        break;
      case 'viewer_count_update':
        dispatch({
          type: 'VIEWER_COUNT_UPDATE',
          payload: event.payload || event,
        });
        break;
      case 'solution_reveal':
        dispatch({
          type: 'SOLUTION_REVEAL',
          payload: event.payload || event,
        });
        break;
      case 'stream_end':
        dispatch({ type: 'STREAM_END' });
        break;
      case 'chat_message':
        dispatch({ type: 'CHAT_MESSAGE', payload: event });
        break;
      case 'event_replay':
        dispatch({ type: 'EVENT_REPLAY', payload: event });
        break;
    }
  }, []);

  const setSubmissionResult = useCallback((submission: MySubmission) => {
    dispatch({ type: 'SUBMISSION_RESULT', payload: submission });
  }, []);

  return { state, dispatch, handleServerEvent, setSubmissionResult };
}

/**
 * Calculate elapsed seconds from wall-clock time (§6.3 timer sync).
 */
export function getElapsedSeconds(challengeStartedAt: number, serverTimeOffset: number, virtualNow?: number): number {
  const now = virtualNow ?? Date.now();
  return Math.floor((now + serverTimeOffset - challengeStartedAt) / 1000);
}

/**
 * Calculate remaining seconds for a challenge timer.
 */
export function getRemainingSeconds(
  challengeStartedAt: number,
  durationSeconds: number,
  serverTimeOffset: number,
  virtualNow?: number
): number {
  const elapsed = getElapsedSeconds(challengeStartedAt, serverTimeOffset, virtualNow);
  return Math.max(0, durationSeconds - elapsed);
}
