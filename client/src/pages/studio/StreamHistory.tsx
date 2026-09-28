import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { getStudioStreams } from '../../lib/api';
import type { StudioStreamsResponse } from '../../lib/api';
import { StreamTable } from '../../components/studio/StreamTable';
import type { StreamRowItem } from '../../components/studio/StreamTable';

interface StudioContextType {
  openCreateStreamModal: () => void;
}

export function StreamHistory() {
  const outletCtx = useOutletContext<StudioContextType>();
  const [data, setData] = useState<StudioStreamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'ENDED'>('ALL');

  const fetchStreams = async (targetPage: number) => {
    try {
      setLoading(true);
      const res = await getStudioStreams(targetPage, limit);
      setData(res);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load studio streams:', err);
      setError(err?.response?.data?.error || 'Failed to load streams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams(page);
  }, [page]);

  // Client-side quick filter for the loaded page
  const filteredStreams = useMemo(() => {
    if (!data?.streams) return [];
    return data.streams.filter((s) => {
      const matchSearch =
        searchQuery === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.course?.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' || s.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [data?.streams, searchQuery, statusFilter]);

  return (
    <div style={{ padding: '32px 40px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Stream History & Archives
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--gray-400)' }}>
            Complete audit of your broadcast sessions, peak viewers, and challenge engagement.
          </p>
        </div>

        <button
          onClick={outletCtx?.openCreateStreamModal}
          className="btn-create-stream"
          style={{ fontSize: 13 }}
        >
          <Plus size={16} /> Create Stream
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        {/* Status Pill Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--gray-900)',
            padding: 4,
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--gray-800)',
          }}
        >
          {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === tab ? 'var(--indigo-500)' : 'transparent',
                color: statusFilter === tab ? '#ffffff' : 'var(--gray-400)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'ALL' ? 'All Sessions' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--gray-900)',
            border: '1px solid var(--gray-800)',
            borderRadius: 'var(--r-md)',
            padding: '8px 14px',
            minWidth: 260,
          }}
        >
          <Search size={16} color="var(--gray-500)" />
          <input
            type="text"
            placeholder="Search stream or course…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: 13,
              width: '100%',
            }}
          />
        </div>
      </div>

      {error ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--red-400)' }}>
          {error}
        </div>
      ) : (
        <StreamTable
          streams={filteredStreams as StreamRowItem[]}
          page={page}
          totalPages={data?.pagination.totalPages || 1}
          total={data?.pagination.total || 0}
          onPageChange={(p) => setPage(p)}
          loading={loading}
        />
      )}
    </div>
  );
}
