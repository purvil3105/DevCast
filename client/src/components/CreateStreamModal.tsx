import { useEffect, useRef, useState } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { getMyCourses, createCourse, createStream, uploadThumbnail } from '../lib/api';

interface CreateStreamModalProps {
  onClose: () => void;
  onCreated: (streamId: string) => void;
}

const DEFAULT_TOPICS = [
  'Frontend Development',
  'Backend Architecture',
  'System Design',
  'Data Structures & Algorithms',
  'DevOps & Deployment',
  'Other (Custom)',
];

const MAX_THUMB_BYTES = 5 * 1024 * 1024;
const ACCEPTED = 'image/png,image/jpeg,image/webp,image/gif';

/**
 * Instructor-only modal for creating a stream. Extracted from HomePage so the
 * dashboards and Live Sessions can share it. Adds an optional thumbnail upload:
 * the file goes to Cloudinary via the server, and the returned URL is attached
 * to the new stream.
 */
export function CreateStreamModal({ onClose, onCreated }: CreateStreamModalProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [selectedTopicName, setSelectedTopicName] = useState('Frontend Development');
  const [customTopicName, setCustomTopicName] = useState('');

  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const myCourses = await getMyCourses();
        if (mounted) setCourses(myCourses || []);
      } catch (err: any) {
        if (!mounted) return;
        setCourseError(
          err?.response?.status === 401
            ? 'Session expired. Please log out and log in again.'
            : 'Failed to load topics. Please try again.'
        );
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Revoke the object URL when the preview changes or the modal unmounts.
  useEffect(() => {
    return () => {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    };
  }, [thumbPreview]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setThumbError(null);

    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      setThumbError('Use a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > MAX_THUMB_BYTES) {
      setThumbError('Image must be 5 MB or smaller.');
      return;
    }

    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const removeThumb = () => {
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(null);
    setThumbPreview(null);
    setThumbError(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setCreateError('Stream title is required');
      return;
    }
    const finalTopic = selectedTopicName === 'Other (Custom)' ? customTopicName : selectedTopicName;
    if (!finalTopic.trim()) {
      setCreateError('Please specify a topic');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      // Upload the thumbnail first (if any) so we can attach its URL.
      let thumbnailUrl: string | undefined;
      if (thumbFile) {
        try {
          thumbnailUrl = await uploadThumbnail(thumbFile);
        } catch (err: any) {
          setCreateError(
            err?.response?.data?.error ||
              'Thumbnail upload failed. Remove the image to create without one.'
          );
          setIsCreating(false);
          return;
        }
      }

      // Find an existing course by topic name, else create it.
      let courseId = '';
      const existing = courses.find((c) => c.title.toLowerCase() === finalTopic.toLowerCase());
      if (existing) {
        courseId = existing.id;
      } else {
        const created = await createCourse(finalTopic);
        courseId = created.id;
      }

      const stream = await createStream(title.trim(), courseId, thumbnailUrl);
      onCreated(stream.id);
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Failed to create stream. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--gray-950)',
    border: '1px solid var(--gray-800)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--text-main)',
    fontSize: 14,
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--gray-400)',
    marginBottom: 8,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6,6,14,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--gray-900)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-lg)',
          width: 480,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
          boxShadow: 'var(--shadow-lg)',
        }}
        className="animate-fade-in-scale"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            Create new stream
          </h2>
          <button aria-label="Close" onClick={onClose} style={{ color: 'var(--gray-500)', display: 'flex', padding: 4, borderRadius: 'var(--r-sm)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Stream title</label>
            <input
              type="text"
              placeholder="e.g. Building a fullstack app from scratch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label style={labelStyle}>Thumbnail <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}>· optional</span></label>
            <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={handlePickFile} style={{ display: 'none' }} />
            {thumbPreview ? (
              <div style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--gray-800)' }}>
                <img src={thumbPreview} alt="Thumbnail preview" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--r-sm)', background: 'rgba(10,10,20,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)' }}
                  >
                    Change
                  </button>
                  <button
                    onClick={removeThumb}
                    style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--r-sm)', background: 'rgba(10,10,20,0.7)', color: 'var(--red-400)', border: '1px solid var(--red-500-30)' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '20px 12px',
                  background: 'var(--gray-950)',
                  border: '1px dashed var(--gray-700)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--gray-400)',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ImagePlus size={22} style={{ color: 'var(--indigo-400)' }} />
                Add a cover image
                <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>PNG, JPG, WEBP or GIF · up to 5 MB · 16:9 looks best</span>
              </button>
            )}
            {thumbError && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--red-400)' }}>{thumbError}</p>}
          </div>

          {/* Topic */}
          <div>
            <label style={labelStyle}>Associated topic</label>
            {loadingCourses ? (
              <p style={{ color: 'var(--gray-500)', fontSize: 14, margin: 0 }}>Loading topics…</p>
            ) : courseError ? (
              <div style={{ padding: '10px 12px', background: 'var(--red-500-10)', border: '1px solid var(--red-500-30)', borderRadius: 'var(--r-sm)', color: 'var(--red-400)', fontSize: 13 }}>
                {courseError}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select value={selectedTopicName} onChange={(e) => setSelectedTopicName(e.target.value)} style={inputStyle}>
                  {DEFAULT_TOPICS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  {courses.filter((c) => !DEFAULT_TOPICS.includes(c.title)).map((c) => (
                    <option key={c.title} value={c.title}>{c.title}</option>
                  ))}
                </select>
                {selectedTopicName === 'Other (Custom)' && (
                  <input
                    type="text"
                    placeholder="Enter custom topic name…"
                    value={customTopicName}
                    onChange={(e) => setCustomTopicName(e.target.value)}
                    style={inputStyle}
                  />
                )}
              </div>
            )}
          </div>

          {createError && (
            <div style={{ padding: '10px 12px', background: 'var(--red-500-10)', border: '1px solid var(--red-500-30)', borderRadius: 'var(--r-sm)', color: 'var(--red-400)', fontSize: 13 }}>
              {createError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button onClick={onClose} style={{ padding: '10px 16px', color: 'var(--gray-400)', fontSize: 14, fontWeight: 500, borderRadius: 'var(--r-sm)' }}>
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                fontSize: 14,
                fontWeight: 600,
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.7 : 1,
                boxShadow: 'var(--glow-violet)',
              }}
            >
              {isCreating && <Loader2 size={16} className="animate-spin" />}
              {isCreating ? 'Creating…' : 'Create stream'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
