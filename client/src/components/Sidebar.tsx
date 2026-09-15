import { useEffect, useState } from 'react';
import { LayoutDashboard, PlayCircle, Code2, Trophy, Settings, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userInitial?: string;
  userName?: string;
}

export function Sidebar({ currentView, onNavigate, userInitial = 'U', userName = 'My Account' }: SidebarProps) {
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('devcast_theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('devcast_theme', 'light');
    } else {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('devcast_theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode(!isLightMode);

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: 'var(--gray-900)',
      borderRight: '1px solid var(--gray-800)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      gap: 32,
    }}>
      {/* Logo Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>
        <div style={{
          borderRadius: 12,
          boxShadow: 'var(--glow-violet)',
          flexShrink: 0,
          lineHeight: 0,
        }}>
          <div style={{ width: 40, height: 40, overflow: 'hidden', position: 'relative', borderRadius: 12 }}>
            <img
              src="/devcast-logo.png"
              alt="DevCast"
              style={{ position: 'absolute', width: 102, maxWidth: 'none', height: 'auto', left: -31, top: -3 }}
            />
          </div>
        </div>
        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--gray-200)' }}>Dev</span>
          <span style={{
            background: 'var(--grad-brand)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}>Cast</span>
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        <SidebarItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={currentView === 'home'}
          onClick={() => onNavigate('home')}
        />
        <SidebarItem
          icon={<PlayCircle size={20} />}
          label="Live Sessions"
          active={currentView === 'stream'}
          onClick={() => onNavigate('stream')}
        />
        <SidebarItem
          icon={<Code2 size={20} />}
          label="Challenges"
          active={currentView === 'challenges'}
          onClick={() => onNavigate('challenges')}
        />
        <SidebarItem
          icon={<Trophy size={20} />}
          label="Leaderboards"
          active={currentView === 'leaderboards'}
          onClick={() => onNavigate('leaderboards')}
        />
      </nav>

      {/* Bottom section */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: '100%',
      }}>
        <SidebarItem 
          icon={isLightMode ? <Moon size={20} /> : <Sun size={20} />} 
          label={isLightMode ? "Dark Mode" : "Light Mode"} 
          onClick={toggleTheme} 
        />
        <SidebarItem
          icon={<Settings size={20} />}
          label="Settings"
          active={currentView === 'settings'}
          onClick={() => onNavigate('settings')}
        />
        
        {/* User Profile */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          marginTop: 16,
          borderTop: '1px solid var(--gray-800)',
          cursor: 'pointer',
          borderRadius: 8,
          transition: 'background 0.2s',
        }}
          onClick={() => onNavigate('settings')}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--indigo-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            border: '2px solid var(--gray-800)',
            transition: 'border-color 0.2s',
            flexShrink: 0,
          }}>
            {userInitial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-300)' }} className="truncate">{userName}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 8,
        color: active ? 'var(--indigo-500)' : 'var(--gray-400)',
        background: active ? 'var(--indigo-500-10)' : 'transparent',
        transition: 'all 0.2s',
        cursor: 'pointer',
        fontWeight: active ? 600 : 500,
        fontSize: 14,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--gray-200)';
          e.currentTarget.style.background = 'var(--hover-bg)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--gray-400)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
