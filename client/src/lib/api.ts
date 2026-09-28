import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// ─── JWT Interceptor ─────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devcast_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('devcast_refresh_token');
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
          localStorage.setItem('devcast_token', data.token);
          // The server rotates refresh tokens — persist the new one or the next
          // refresh will fail with a revoked token.
          if (data.refreshToken) {
            localStorage.setItem('devcast_refresh_token', data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — logout
        localStorage.removeItem('devcast_token');
        localStorage.removeItem('devcast_refresh_token');
        localStorage.removeItem('devcast_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'INSTRUCTOR' | 'VIEWER';
}

export async function register(email: string, password: string, displayName: string, role: User['role']) {
  const { data } = await api.post('/auth/register', { email, password, displayName, role });
  localStorage.setItem('devcast_token', data.token);
  localStorage.setItem('devcast_refresh_token', data.refreshToken);
  localStorage.setItem('devcast_user', JSON.stringify(data.user));
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('devcast_token', data.token);
  localStorage.setItem('devcast_refresh_token', data.refreshToken);
  localStorage.setItem('devcast_user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('devcast_token');
  localStorage.removeItem('devcast_refresh_token');
  localStorage.removeItem('devcast_user');
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('devcast_user');
  return raw ? JSON.parse(raw) : null;
}

export function getToken(): string | null {
  return localStorage.getItem('devcast_token');
}

// ─── Courses ──────────────────────────────────────────────
export async function getMyCourses() {
  const { data } = await api.get('/courses/my');
  return data.courses;
}

export async function createCourse(title: string) {
  const { data } = await api.post('/courses', { title });
  return data.course;
}

// ─── Streams ─────────────────────────────────────────────
export interface StreamSummary {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  hlsUrl: string | null;
  thumbnailUrl: string | null;
  startedAt: string | null;
  course: string;
  courseSlug: string;
  instructor: string;
  instructorId: string;
  viewerCount: number;
  challengeSessions: Array<{
    id: string;
    status: 'ACTIVE' | 'CLOSED';
    startedAt: string | null;
    endedAt: string | null;
    challenge: { id: string; title: string };
  }>;
}

export async function listStreams(status?: string): Promise<StreamSummary[]> {
  const { data } = await api.get('/streams', { params: status ? { status } : {} });
  return data.streams;
}

export async function getStream(id: string) {
  const { data } = await api.get(`/streams/${id}`);
  return data.stream;
}

export async function getStreamEvents(id: string) {
  const { data } = await api.get(`/streams/${id}/events`);
  return data.events;
}

export async function createStream(title: string, courseId: string, thumbnailUrl?: string) {
  const { data } = await api.post('/streams', { title, courseId, thumbnailUrl });
  return data.stream;
}

/**
 * Upload a stream thumbnail image. Sends multipart/form-data to the
 * instructor-only upload route and returns the hosted (Cloudinary) URL.
 */
export async function uploadThumbnail(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}

export async function goLive(streamId: string, hlsUrl?: string) {
  const { data } = await api.patch(`/streams/${streamId}/go-live`, { hlsUrl });
  return data.stream;
}

export async function endStream(streamId: string) {
  const { data } = await api.patch(`/streams/${streamId}/end`);
  return data.stream;
}

export async function sendChatMessage(streamId: string, message: string) {
  const { data } = await api.post(`/streams/${streamId}/chat`, { message });
  return data;
}

// ─── Challenges ──────────────────────────────────────────
export async function listChallenges(courseId: string) {
  const { data } = await api.get('/challenges', { params: { courseId } });
  return data.challenges;
}

export async function createChallenge(challenge: any) {
  const { data } = await api.post('/challenges', challenge);
  return data.challenge;
}

export async function generateTestCases(
  title: string,
  description: string,
  language: string,
  sampleInput?: string,
  sampleOutput?: string
) {
  const { data } = await api.post('/challenges/generate-testcases', {
    title,
    description,
    language,
    sampleInput,
    sampleOutput,
  });
  return data as {
    starterCode: string;
    testCases: Array<{ input: string; expected_output: string; description: string }>;
  };
}

export async function triggerChallenge(streamId: string, challengeId: string, durationSeconds: number = 120) {
  const { data } = await api.post(`/challenges/${streamId}/trigger`, {
    challengeId,
    durationSeconds,
  });
  return data;
}

export async function endChallenge(streamId: string) {
  const { data } = await api.post(`/challenges/${streamId}/end`);
  return data;
}

export async function revealSolution(streamId: string, code: string) {
  const { data } = await api.post(`/challenges/${streamId}/reveal-solution`, { code });
  return data;
}

// ─── Submissions ─────────────────────────────────────────
export async function runCode(code: string, language: string, challengeSessionId: string) {
  const { data } = await api.post('/submissions/run', { code, language, challengeSessionId });
  return data; // { testResults, executionTimeMs, saved: false }
}

export async function submitCode(code: string, language: string, challengeSessionId: string) {
  const { data } = await api.post('/submissions', { code, language, challengeSessionId });
  return data;
}

export async function getLeaderboard(challengeSessionId: string) {
  const { data } = await api.get(`/submissions/leaderboard/${challengeSessionId}`);
  return data; // { leaderboard: [], status: 'in_progress' | 'completed' }
}

// ─── Viewer progress & achievements ──────────────────────
export interface MySubmission {
  id: string;
  submittedAt: string;
  language: string;
  status: 'PENDING' | 'EXECUTED' | 'AI_EVALUATED' | 'ERROR';
  executionTimeMs: number | null;
  aiScore: string | number | null;
  passed: number;
  total: number;
  score: number;
  challenge: { id: string; title: string; language: string };
  stream: { id: string; title: string; status: 'SCHEDULED' | 'LIVE' | 'ENDED' } | null;
  sessionId: string;
  sessionStatus: 'ACTIVE' | 'CLOSED';
}

export interface MySubmissionsSummary {
  totalAttempts: number;
  distinctChallenges: number;
  challengesCompleted: number;
  avgScore: number;
  bestScore: number;
  passRate: number;
  perfectCount: number;
  languages: string[];
  fastestMs: number | null;
}

export async function getMySubmissions(): Promise<{
  submissions: MySubmission[];
  summary: MySubmissionsSummary;
}> {
  const { data } = await api.get('/submissions/my');
  return data;
}

export interface GlobalRankRow {
  rank: number;
  userId: string;
  user: string;
  points: number;
  challengesCompleted: number;
  attempts: number;
  isMe: boolean;
}

export async function getGlobalLeaderboard(): Promise<{
  leaderboard: GlobalRankRow[];
  me: GlobalRankRow | null;
  totalRanked: number;
}> {
  const { data } = await api.get('/leaderboard/global');
  return data;
}

// ─── Profile ─────────────────────────────────────────────
export async function getMyProfile() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function updateProfile(updates: { displayName?: string; email?: string }) {
  const { data } = await api.patch('/auth/me', updates);
  // Update local storage with new user data
  if (data.user) {
    localStorage.setItem('devcast_user', JSON.stringify(data.user));
  }
  return data.user;
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.patch('/auth/password', { currentPassword, newPassword });
  return data;
}

// ─── All Challenges (browse) ─────────────────────────────
export async function listAllChallenges() {
  const { data } = await api.get('/challenges');
  return data.challenges;
}

// ─── All Challenge Sessions (for global leaderboard) ─────
export async function listChallengeSessions() {
  const { data } = await api.get('/challenges/sessions');
  return data.sessions;
}

// ─── Reactions ───────────────────────────────────────────
// ─── Creator Studio ──────────────────────────────────────
export interface StudioOverviewData {
  totalStreams: number;
  totalViews: number;
  avgViewers: number;
  totalSubmissions: number;
  activeStream: {
    id: string;
    title: string;
    status: string;
    startedAt: string | null;
    thumbnailUrl: string | null;
    course: { id: string; title: string };
    viewerCount: number;
    durationSeconds: number | null;
  } | null;
  recentSessions: Array<{
    id: string;
    title: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    peakViewers: number;
    thumbnailUrl: string | null;
    courseTitle: string;
    submissionCount: number;
  }>;
}

export interface StudioStreamsResponse {
  streams: Array<{
    id: string;
    title: string;
    status: 'SCHEDULED' | 'LIVE' | 'ENDED';
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    peakViewers: number;
    thumbnailUrl: string | null;
    course: { id: string; title: string };
    challengeCount: number;
    submissionCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StudioStreamDetailResponse {
  stream: {
    id: string;
    title: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    peakViewers: number;
    thumbnailUrl: string | null;
    streamKey?: string;
    course: {
      id: string;
      title: string;
      slug: string;
    };
  };
  stats: {
    peakViewers: number;
    totalSubmissions: number;
    challengesFired: number;
    avgSolveRate: number;
  };
  challenges: Array<{
    sessionId: string;
    challengeId: string;
    title: string;
    description: string;
    language: string;
    startedAt: string | null;
    endedAt: string | null;
    status: string;
    durationSeconds: number;
    submissionCount: number;
    passedCount: number;
    solveRate: number;
    avgExecutionTimeMs: number | null;
  }>;
}

export async function getStudioOverview(): Promise<StudioOverviewData> {
  const { data } = await api.get('/studio/overview');
  return data;
}

export async function getStudioStreams(page = 1, limit = 10): Promise<StudioStreamsResponse> {
  const { data } = await api.get('/studio/streams', { params: { page, limit } });
  return data;
}

export async function getStudioStreamDetail(id: string): Promise<StudioStreamDetailResponse> {
  const { data } = await api.get(`/studio/streams/${id}`);
  return data;
}

export default api;

