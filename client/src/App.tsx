
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/HomePage';
import { LiveSessionsPage } from './pages/LiveSessionsPage';
import { StreamPage } from './pages/StreamPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { LeaderboardsPage } from './pages/LeaderboardsPage';
import { SettingsPage } from './pages/SettingsPage';
import { getStoredUser } from './lib/api';

function AppContent() {
  const user = getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current view from path
  const getCurrentView = (): string => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/live' || location.pathname.startsWith('/stream')) return 'stream';
    if (location.pathname === '/challenges') return 'challenges';
    if (location.pathname === '/leaderboards') return 'leaderboards';
    if (location.pathname === '/settings') return 'settings';
    return 'home';
  };

  const handleNavigate = (view: string) => {
    switch (view) {
      case 'home': navigate('/'); break;
      case 'stream': navigate('/live'); break; // Live Sessions = browse/discover
      case 'challenges': navigate('/challenges'); break;
      case 'leaderboards': navigate('/leaderboards'); break;
      case 'settings': navigate('/settings'); break;
      default: navigate('/');
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
    }}>
      <Sidebar
        currentView={getCurrentView()}
        onNavigate={handleNavigate}
        userInitial={user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
        userName={user?.displayName || 'User'}
      />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LiveSessionsPage />} />
          <Route path="/stream/:streamId" element={<StreamPage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const user = getStoredUser();
  const isLoggedIn = !!user;

  if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
