import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clapperboard, Eye, EyeOff, Radio, Sparkles } from 'lucide-react';
import { login, register, type User } from '../lib/api';

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
      if (isRegister) await register(email, password, displayName, role);
      else await login(email, password);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <Link to="/" className="auth-back"><ArrowLeft size={16} /> Back to home</Link>
      <section className="auth-layout">
        <div className="auth-story">
          <div className="auth-kicker"><Sparkles size={15} /> LIVE DEVELOPER NETWORK</div>
          <img className="auth-logo" src="/devcast-logo.png" alt="DevCast - live coding, real learning" />
          <h1>{isRegister ? 'Build your next chapter live.' : 'Welcome back to the studio.'}</h1>
          <p>{isRegister ? 'Join a room where code becomes conversation, and every challenge moves you forward.' : 'Pick up where you left off, join the room, and keep building alongside the community.'}</p>
          <div className="auth-story-signal"><Radio size={15} /><span><strong>Live now</strong> · React patterns with Sarah</span><i /></div>
          <div className="auth-story-note"><span className="signal-dot" /> Real people. Real code. Real progress.</div>
        </div>
        <div className="auth-panel">
          <div className="auth-panel-heading"><span className="eyebrow">DEVCAST ACCESS</span><h2>{isRegister ? 'Create your account' : 'Sign in'}</h2><p>{isRegister ? 'Choose how you want to show up.' : 'Your next live session is waiting.'}</p></div>
          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && <label>Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Hamilton" required /></label>}
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {isRegister && <div className="role-picker"><span className="field-label">I am joining as</span><div className="role-options"><button type="button" className={role === 'VIEWER' ? 'role-option selected' : 'role-option'} onClick={() => setRole('VIEWER')}><BookOpen size={18} /><span><strong>Viewer</strong><small>Learn, practice, and climb.</small></span></button><button type="button" className={role === 'INSTRUCTOR' ? 'role-option selected' : 'role-option'} onClick={() => setRole('INSTRUCTOR')}><Clapperboard size={18} /><span><strong>Instructor</strong><small>Teach, stream, and lead.</small></span></button></div></div>}
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'One moment...' : isRegister ? 'Create account' : 'Enter DevCast'}</button>
          </form>
          <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to DevCast?'} <button onClick={() => switchMode(!isRegister)}>{isRegister ? 'Sign in' : 'Create one'}</button></p>
        </div>
      </section>
      <footer className="auth-footer">© 2026 DevCast · Live coding. Real learning.</footer>
    </div>
  );
}
