import { useEffect, useState } from 'react';
import { Terminal, Radio, Sparkles } from 'lucide-react';

interface TerminalStreamProps {
  isRegister?: boolean;
}

const loginCommits = [
  [
    { prompt: '$', text: 'git commit -m "feat: real-time challenge room"' },
    { out: '✓ 8 tests passed (124ms)' },
    { prompt: '$', text: 'git push origin main' },
    { out: '→ remote: deployed to devcast-edge-01' },
  ],
  [
    { prompt: '$', text: 'npm test -- --filter=concurrency' },
    { out: '✓ 12/12 concurrency cases passed' },
    { prompt: '$', text: 'git commit -m "fix: race condition in worker"' },
    { out: '→ clean working tree, verified' },
  ],
];

const signupCommits = [
  [
    { prompt: '$', text: 'devcast init --profile=builder' },
    { out: '✓ developer sandbox initialized' },
    { prompt: '$', text: 'devcast connect --room=live-01' },
    { out: '→ synchronized state with 8,420 peers' },
  ],
  [
    { prompt: '$', text: 'devcast challenge claim "two-sum"' },
    { out: '✓ starter code loaded in TypeScript' },
    { prompt: '$', text: 'devcast test --watch' },
    { out: '→ ready to submit solution' },
  ],
];

const chatMessages = [
  { user: 'mira.codes', msg: 'the useMemo here is key' },
  { user: 'sanjay.dev', msg: 'finally clicked for me 🎯' },
  { user: 'lena_loop', msg: '+120 XP on that one' },
  { user: 'alex_k', msg: 'clean recursive approach' },
  { user: 'dev_dan', msg: 'submitting test case 4 now' },
];

export function TerminalStream({ isRegister = false }: TerminalStreamProps) {
  const commitSets = isRegister ? signupCommits : loginCommits;
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [chatIdx, setChatIdx] = useState(0);

  // Terminal line advancement
  useEffect(() => {
    const currentLines = commitSets[activeSetIndex];
    if (lineIdx < currentLines.length) {
      const timer = setTimeout(() => {
        setLineIdx((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      const resetTimer = setTimeout(() => {
        setLineIdx(0);
        setActiveSetIndex((prev) => (prev + 1) % commitSets.length);
      }, 3500);
      return () => clearTimeout(resetTimer);
    }
  }, [lineIdx, activeSetIndex, commitSets]);

  // Chat rotation
  useEffect(() => {
    const chatTimer = setInterval(() => {
      setChatIdx((prev) => (prev + 1) % chatMessages.length);
    }, 2800);
    return () => clearInterval(chatTimer);
  }, []);

  const visibleLines = commitSets[activeSetIndex].slice(0, lineIdx + 1);

  return (
    <div className="terminal-stream-panel">
      {/* Scanline texture */}
      <div className="terminal-scanlines" aria-hidden="true" />

      {/* Broadcast header */}
      <div className="terminal-status-header">
        <div className="terminal-live-tag">
          <span className="pulse-red-dot" />
          <span>{isRegister ? 'SANDBOX READY' : 'LIVE NOW'}</span>
        </div>
        <div className="terminal-stream-title">
          <Radio size={12} className="stream-radio-icon" />
          <span>{isRegister ? 'DevCast Builder Environment' : 'React patterns with Sarah'}</span>
        </div>
      </div>

      {/* Audio Waveform Bars (Pure CSS) */}
      <div className="waveform-container" title="Audio stream active">
        <span className="waveform-label">AUDIO FEED</span>
        <div className="waveform-bars">
          {[45, 80, 60, 95, 30, 75, 90, 50, 85, 40].map((h, i) => (
            <span
              key={i}
              className="wave-bar"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Terminal Block */}
      <div className="terminal-window">
        <div className="terminal-window-header">
          <Terminal size={12} />
          <span>session-terminal · bash</span>
        </div>
        <div className="terminal-body">
          {visibleLines.map((line, idx) => (
            <div className="terminal-row" key={idx}>
              {'prompt' in line ? (
                <>
                  <span className="term-prompt">{line.prompt}</span>
                  <span className="term-cmd">{line.text}</span>
                  {idx === visibleLines.length - 1 && lineIdx < commitSets[activeSetIndex].length && (
                    <span className="term-cursor" />
                  )}
                </>
              ) : (
                <span className="term-out">{line.out}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat activity stream */}
      <div className="terminal-chat-stream">
        <div className="terminal-chat-label">
          <Sparkles size={11} />
          <span>ROOM DISCUSSION</span>
        </div>
        <div className="terminal-chat-list">
          {[0, 1, 2].map((offset) => {
            const item = chatMessages[(chatIdx + offset) % chatMessages.length];
            return (
              <div
                className="terminal-chat-msg"
                key={`${item.user}-${offset}-${chatIdx}`}
                style={{ opacity: 1 - offset * 0.28 }}
              >
                <span className="chat-user">{item.user}:</span>
                <span className="chat-body">{item.msg}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
