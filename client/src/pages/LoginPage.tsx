import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  Eye,
  EyeOff,
} from 'lucide-react';
import { login, register, type User } from '../lib/api';
import { TerminalStream } from '../components/auth/TerminalStream';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(location.pathname === '/signup');
  const [role, setRole] = useState<User['role']>('VIEWER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (registerMode: boolean) => {
    setIsRegister(registerMode);
    setError('');
    navigate(registerMode ? '/signup' : '/login', { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const finalDisplayName = displayName.trim() || 'Builder';
        await register(email.trim(), password, finalDisplayName, role);
      } else {
        await login(email.trim(), password);
      }
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Return to home link */}
      <Link to="/" className="auth-back-link">
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div className="auth-split-layout">
        {/* Left Panel: Studio Atmosphere & Terminal Set Piece */}
        <div className="auth-left-panel">
          <div className="dot-grid-bg" aria-hidden="true" />
          <TerminalStream isRegister={isRegister} />
        </div>

        {/* Right Panel: Clean High-Contrast Auth Form */}
        <div className="auth-right-panel">
          <div className="auth-form-card">
            {/* Prominent DevCast Logo */}
            <div className="auth-brand-lockup">
              <Link to="/" title="DevCast — Back to Home">
                <img
                  src="/logo-dark.png"
                  alt="DevCast"
                  className="auth-logo-large"
                />
              </Link>
            </div>

            <div className="auth-form-header">
              <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
              <p>
                {isRegister
                  ? 'Join live rooms, run executable challenges, and climb the leaderboard.'
                  : 'Enter the broadcast studio and pick up where you left off.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {isRegister && (
                <div className="auth-field-group">
                  <label className="auth-label">Display name</label>
                  <input
                    className="auth-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Hamilton"
                    required
                    autoFocus
                  />
                </div>
              )}

              <div className="auth-field-group">
                <label className="auth-label">Email</label>
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div className="auth-field-group">
                  <label className="auth-label">I am joining as</label>
                  <div className="auth-role-grid">
                    <button
                      type="button"
                      className={`auth-role-card ${role === 'VIEWER' ? 'selected' : ''}`}
                      onClick={() => setRole('VIEWER')}
                    >
                      <BookOpen size={16} color={role === 'VIEWER' ? 'var(--indigo-400)' : 'var(--gray-500)'} />
                      <div>
                        <strong>Viewer</strong>
                        <small>Learn, test, climb</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`auth-role-card ${role === 'INSTRUCTOR' ? 'selected' : ''}`}
                      onClick={() => setRole('INSTRUCTOR')}
                    >
                      <Clapperboard size={16} color={role === 'INSTRUCTOR' ? 'var(--indigo-400)' : 'var(--gray-500)'} />
                      <div>
                        <strong>Instructor</strong>
                        <small>Stream, host, lead</small>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {error && <div className="auth-error-banner">{error}</div>}

              <button className="auth-submit-btn" type="submit" disabled={loading}>
                {loading
                  ? 'Authenticating...'
                  : isRegister
                  ? 'Create account'
                  : 'Enter DevCast'}
              </button>
            </form>

            <p className="auth-switch-text">
              {isRegister ? 'Already have an account? ' : 'New to DevCast? '}
              <button type="button" onClick={() => switchMode(!isRegister)}>
                {isRegister ? 'Sign in' : 'Create one'}
              </button>
            </p>

            <div className="auth-editorial-footer">
              Real people · Real code · Real progress
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
