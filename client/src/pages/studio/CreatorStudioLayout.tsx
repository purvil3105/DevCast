import { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Clapperboard, Plus, LayoutDashboard, History } from 'lucide-react';
import { getStoredUser } from '../../lib/api';
import { CreateStreamModal } from '../../components/CreateStreamModal';

export function CreatorStudioLayout() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Guard: Creator Studio is for instructors only
  if (user && user.role !== 'INSTRUCTOR') {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Studio Header Bar */}
      <header
        style={{
          padding: '24px 40px 0',
          background: 'var(--gray-950)',
          borderBottom: '1px solid var(--gray-800)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--r-sm)',
                  background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: 'var(--glow-violet)',
                }}
              >
                <Clapperboard size={18} />
              </span>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Creator Studio
              </h1>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--gray-400)' }}>
              Broadcast performance, real-time stream monitor, and learner challenge submissions.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-create-stream"
            style={{ fontSize: 13 }}
          >
            <Plus size={16} /> Create Stream
          </button>
        </div>

        {/* Sub-Nav Tabs */}
        <nav style={{ display: 'flex', gap: 24 }}>
          <NavLink
            to="/studio"
            end
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 4px 14px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? 'var(--indigo-400)' : 'var(--gray-400)',
              borderBottom: isActive ? '2px solid var(--indigo-500)' : '2px solid transparent',
              transition: 'color 0.2s, border-color 0.2s',
            })}
          >
            <LayoutDashboard size={16} /> Overview
          </NavLink>

          <NavLink
            to="/studio/streams"
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 4px 14px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? 'var(--indigo-400)' : 'var(--gray-400)',
              borderBottom: isActive ? '2px solid var(--indigo-500)' : '2px solid transparent',
              transition: 'color 0.2s, border-color 0.2s',
            })}
          >
            <History size={16} /> Stream History
          </NavLink>
        </nav>
      </header>

      {/* Main Studio Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet context={{ openCreateStreamModal: () => setShowCreateModal(true) }} />
      </div>

      {showCreateModal && (
        <CreateStreamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(streamId) => {
            setShowCreateModal(false);
            navigate(`/stream/${streamId}`);
          }}
        />
      )}
    </div>
  );
}
