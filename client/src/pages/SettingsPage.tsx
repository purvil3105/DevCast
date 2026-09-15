import { useState, useEffect } from 'react';
import { getMyProfile, updateProfile, updatePassword, logout, getStoredUser } from '../lib/api';
import { User, Mail, Lock, Save, LogOut, Shield, Bell, Palette, Check, AlertCircle } from 'lucide-react';

/**
 * SettingsPage — User profile, password, and preferences management.
 */
export function SettingsPage() {
  const storedUser = getStoredUser();

  // Profile form
  const [displayName, setDisplayName] = useState(storedUser?.displayName || '');
  const [email, setEmail] = useState(storedUser?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Active section
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    // Load fresh profile data
    getMyProfile().then(user => {
      if (user) {
        setDisplayName(user.displayName);
        setEmail(user.email);
      }
    }).catch(() => {});
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await updateProfile({ displayName, email });
      setProfileSuccess('Profile updated successfully');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'preferences', label: 'Preferences', icon: <Palette size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--gray-950)',
    border: '1px solid var(--gray-800)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--gray-300)',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: '32px 40px',
      background: 'var(--gray-950)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--gray-100)', margin: 0 }}>
          Settings
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 15, marginTop: 4 }}>
          Manage your account and preferences
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left nav */}
        <div style={{
          width: 220,
          flexShrink: 0,
          background: 'var(--gray-900)',
          border: '1px solid var(--gray-800)',
          borderRadius: 14,
          padding: 8,
        }}>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: activeSection === section.id ? 600 : 400,
                cursor: 'pointer',
                color: activeSection === section.id ? 'var(--indigo-400)' : 'var(--gray-400)',
                background: activeSection === section.id ? 'var(--indigo-500-10)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              {section.icon}
              {section.label}
            </button>
          ))}

          {/* Logout button */}
          <div style={{ borderTop: '1px solid var(--gray-800)', margin: '8px 0', padding: '8px 0 0' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                color: '#ef4444',
                background: 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          background: 'var(--gray-900)',
          border: '1px solid var(--gray-800)',
          borderRadius: 14,
          padding: 32,
        }}>
          {/* ─── Profile Section ─── */}
          {activeSection === 'profile' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-200)', margin: '0 0 8px' }}>
                Profile
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
                Update your personal information
              </p>

              {/* Avatar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 32,
                padding: 20,
                background: 'var(--gray-950)',
                borderRadius: 12,
                border: '1px solid var(--gray-800)',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'var(--indigo-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-200)', margin: 0 }}>
                    {displayName}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                    {storedUser?.role === 'INSTRUCTOR' ? '🎤 Instructor' : '👀 Viewer'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} /> Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--indigo-500)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--gray-800)'; }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={14} /> Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--indigo-500)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--gray-800)'; }}
                  />
                </div>

                {/* Success/Error messages */}
                {profileSuccess && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: 8,
                    color: '#22c55e',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <Check size={16} /> {profileSuccess}
                  </div>
                )}
                {profileError && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 8,
                    color: '#ef4444',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <AlertCircle size={16} /> {profileError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    background: profileLoading ? 'var(--gray-800)' : 'var(--indigo-600)',
                    color: profileLoading ? 'var(--gray-500)' : 'white',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    boxShadow: profileLoading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-start',
                  }}
                >
                  <Save size={16} />
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* ─── Security Section ─── */}
          {activeSection === 'security' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-200)', margin: '0 0 8px' }}>
                Security
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
                Change your password
              </p>

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={14} /> Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={inputStyle}
                    required
                    onFocus={(e) => { e.target.style.borderColor = 'var(--indigo-500)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--gray-800)'; }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={14} /> New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    style={inputStyle}
                    required
                    minLength={6}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--indigo-500)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--gray-800)'; }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={14} /> Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    required
                    onFocus={(e) => { e.target.style.borderColor = 'var(--indigo-500)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--gray-800)'; }}
                  />
                </div>

                {passwordSuccess && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: 8,
                    color: '#22c55e',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <Check size={16} /> {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 8,
                    color: '#ef4444',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <AlertCircle size={16} /> {passwordError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    background: passwordLoading ? 'var(--gray-800)' : 'var(--indigo-600)',
                    color: passwordLoading ? 'var(--gray-500)' : 'white',
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                    boxShadow: passwordLoading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-start',
                  }}
                >
                  <Shield size={16} />
                  {passwordLoading ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* ─── Preferences Section ─── */}
          {activeSection === 'preferences' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-200)', margin: '0 0 8px' }}>
                Preferences
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
                Customize your DevCast experience
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Theme setting */}
                <div style={{
                  padding: 20,
                  background: 'var(--gray-950)',
                  border: '1px solid var(--gray-800)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-300)', margin: 0 }}>Theme</p>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Choose your preferred color scheme</p>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    background: 'var(--indigo-500-10)',
                    color: 'var(--indigo-400)',
                    border: '1px solid var(--indigo-500-30)',
                  }}>
                    Use sidebar toggle
                  </div>
                </div>

                {/* Editor font size */}
                <div style={{
                  padding: 20,
                  background: 'var(--gray-950)',
                  border: '1px solid var(--gray-800)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-300)', margin: 0 }}>Code Editor Font Size</p>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Adjust the text size in the coding sandbox</p>
                  </div>
                  <select style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: 'var(--gray-950)',
                    border: '1px solid var(--gray-800)',
                    color: 'var(--gray-300)',
                    cursor: 'pointer',
                  }}>
                    <option value="12">12px</option>
                    <option value="14" selected>14px</option>
                    <option value="16">16px</option>
                    <option value="18">18px</option>
                  </select>
                </div>

                {/* Auto-submit */}
                <div style={{
                  padding: 20,
                  background: 'var(--gray-950)',
                  border: '1px solid var(--gray-800)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-300)', margin: 0 }}>Default Language</p>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Preferred programming language for challenges</p>
                  </div>
                  <select style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: 'var(--gray-950)',
                    border: '1px solid var(--gray-800)',
                    color: 'var(--gray-300)',
                    cursor: 'pointer',
                  }}>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ─── Notifications Section ─── */}
          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-200)', margin: '0 0 8px' }}>
                Notifications
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
                Configure when and how you receive notifications
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Stream going live', desc: 'Get notified when an instructor starts a live session', default: true },
                  { label: 'Challenge results', desc: 'Get notified when your submission is graded', default: true },
                  { label: 'Leaderboard updates', desc: 'Get notified when someone overtakes your rank', default: false },
                  { label: 'New challenges', desc: 'Get notified when new challenges are added to a course', default: false },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: 20,
                    background: 'var(--gray-950)',
                    border: '1px solid var(--gray-800)',
                    borderRadius: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-300)', margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{item.desc}</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      width: 44,
                      height: 24,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}>
                      <input
                        type="checkbox"
                        defaultChecked={item.default}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 12,
                        background: item.default ? 'var(--indigo-600)' : 'var(--gray-700)',
                        transition: 'background 0.2s',
                      }}>
                        <span style={{
                          position: 'absolute',
                          top: 2,
                          left: item.default ? 22 : 2,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'white',
                          transition: 'left 0.2s',
                        }} />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
