import { useEffect, useState } from 'react';
import { LayoutDashboard, Radio, Terminal, Trophy, Settings, Sun, Moon, Clapperboard } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userInitial?: string;
  userName?: string;
  userRole?: string;
}

export function Sidebar({ currentView, onNavigate, userInitial = 'U', userName = 'My Account', userRole }: SidebarProps) {
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
      <div
        onClick={() => onNavigate('home')}
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 6,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        title="DevCast Dashboard"
      >
        <img
          src={isLightMode ? '/logo-light.png' : '/logo-dark.png'}
          alt="DevCast"
          style={{
            height: 32,
            width: 'auto',
            display: 'block',
            objectFit: 'contain',
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        <SidebarItem
          icon={<LayoutDashboard size={19} />}
          label="Dashboard"
          active={currentView === 'home'}
          onClick={() => onNavigate('home')}
        />
        <SidebarItem
          icon={<Radio size={19} />}
          label="Live Sessions"
          active={currentView === 'stream'}
          onClick={() => onNavigate('stream')}
        />
        {userRole === 'INSTRUCTOR' ? (
          <SidebarItem
            icon={<Clapperboard size={19} />}
            label="Creator Studio"
            active={currentView === 'studio'}
            onClick={() => onNavigate('studio')}
          />
        ) : (
          <>
            <SidebarItem
              icon={<Terminal size={19} />}
              label="Challenges"
              active={currentView === 'challenges'}
              onClick={() => onNavigate('challenges')}
            />
            <SidebarItem
              icon={<Trophy size={19} />}
              label="Leaderboards"
              active={currentView === 'leaderboards'}
              onClick={() => onNavigate('leaderboards')}
            />
          </>
        )}
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
          icon={isLightMode ? <Moon size={19} /> : <Sun size={19} />} 
          label={isLightMode ? "Dark Mode" : "Light Mode"} 
          onClick={toggleTheme} 
        />
        <SidebarItem
          icon={<Settings size={19} />}
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
            background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            border: '2px solid var(--gray-800)',
            transition: 'border-color 0.2s',
            flexShrink: 0,
          }}>
            {userInitial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-main)' }} className="truncate">{userName}</span>
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
        border: 'none',
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
