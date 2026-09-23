import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Trophy } from 'lucide-react';

const fullCode = [
  { text: 'function ', type: 'kw' },
  { text: 'twoSum', type: 'fn' },
  { text: '(nums: ', type: 'plain' },
  { text: 'number[]', type: 'type' },
  { text: ', target: ', type: 'plain' },
  { text: 'number', type: 'type' },
  { text: '): ', type: 'plain' },
  { text: 'number[]', type: 'type' },
  { text: ' {\n', type: 'plain' },
  { text: '  const ', type: 'kw' },
  { text: 'map = ', type: 'plain' },
  { text: 'new ', type: 'kw' },
  { text: 'Map<', type: 'plain' },
  { text: 'number', type: 'type' },
  { text: ', ', type: 'plain' },
  { text: 'number', type: 'type' },
  { text: '>();\n', type: 'plain' },
  { text: '  for ', type: 'kw' },
  { text: '(const ', type: 'kw' },
  { text: '[i, n] ', type: 'plain' },
  { text: 'of ', type: 'kw' },
  { text: 'nums.entries()) {\n', type: 'plain' },
  { text: '    const ', type: 'kw' },
  { text: 'diff = target - n;\n', type: 'plain' },
  { text: '    if ', type: 'kw' },
  { text: '(map.has(diff)) {\n', type: 'plain' },
  { text: '      return ', type: 'kw' },
  { text: '[map.get(diff)!, i];\n', type: 'plain' },
  { text: '    }\n', type: 'plain' },
  { text: '    map.set(n, i);\n', type: 'plain' },
  { text: '  }\n', type: 'plain' },
  { text: '  return ', type: 'kw' },
  { text: '[];\n', type: 'plain' },
  { text: '}', type: 'plain' },
];

const totalChars = fullCode.reduce((acc, curr) => acc + curr.text.length, 0);

const leaderboardRoster = [
  [
    { rank: '01', name: 'mira.codes', xp: '2,840 xp', challenge: 'Graphs BFS' },
    { rank: '02', name: 'sanjay.dev', xp: '2,510 xp', challenge: 'Two Sum' },
    { rank: '03', name: 'lena_loop', xp: '2,240 xp', challenge: 'LRU Cache' },
  ],
  [
    { rank: '01', name: 'alex.k', xp: '2,920 xp', challenge: 'Binary Trees' },
    { rank: '02', name: 'mira.codes', xp: '2,840 xp', challenge: 'Graphs BFS' },
    { rank: '03', name: 'dev_dan', xp: '2,400 xp', challenge: 'Trie Search' },
  ],
];

export function StreamSimulator() {
  const [charCount, setCharCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [viewers, setViewers] = useState(247);
  const [leaderboardSet, setLeaderboardSet] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewer count jitter
  useEffect(() => {
    const viewerTimer = setInterval(() => {
      setViewers((prev) => {
        const delta = Math.floor(Math.random() * 5) - 1; // -1 to +3
        return Math.max(235, Math.min(310, prev + delta));
      });
    }, 4500);

    return () => clearInterval(viewerTimer);
  }, []);

  // Leaderboard cycle
  useEffect(() => {
    const lbTimer = setInterval(() => {
      setLeaderboardSet((prev) => (prev + 1) % leaderboardRoster.length);
    }, 4000);

    return () => clearInterval(lbTimer);
  }, []);

  // Code typing loop
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (charCount < totalChars) {
      timer = setTimeout(() => {
        setCharCount((prev) => prev + 1);
      }, 45);
    } else {
      setIsFinished(true);
      timer = setTimeout(() => {
        setIsFinished(false);
        setCharCount(0);
      }, 4200);
    }

    return () => clearTimeout(timer);
  }, [charCount]);

  // Construct styled tokens up to charCount
  const renderTokens = () => {
    let remaining = charCount;
    const lines: Array<Array<{ text: string; type: string }>> = [[]];

    for (const chunk of fullCode) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, chunk.text.length);
      const textToRender = chunk.text.slice(0, take);
      remaining -= take;

      const subLines = textToRender.split('\n');
      for (let i = 0; i < subLines.length; i++) {
        if (i > 0) lines.push([]);
        if (subLines[i].length > 0) {
          lines[lines.length - 1].push({ text: subLines[i], type: chunk.type });
        }
      }
    }

    return lines;
  };

  const renderedLines = renderTokens();

  return (
    <div className="stream-simulator" ref={containerRef}>
      {/* Editor Window */}
      <div className="mock-editor">
        {/* Chrome Bar */}
        <div className="editor-chrome">
          <div className="dots">
            <span className="dot dot-r" />
            <span className="dot dot-y" />
            <span className="dot dot-g" />
          </div>
          <div className="editor-tab">
            <span className="editor-file">solution.ts</span>
          </div>
          <div className="editor-chrome-right">
            <span className="live-badge">
              <span className="live-dot" /> LIVE
            </span>
          </div>
        </div>

        {/* Code Content */}
        <div className="editor-code">
          {renderedLines.map((lineTokens, lineIdx) => (
            <div className="code-line-row" key={lineIdx}>
              <span className="ln">{lineIdx + 1}</span>
              <span className="line-content">
                {lineTokens.map((tok, tokIdx) => (
                  <span key={tokIdx} className={`tok-${tok.type}`}>
                    {tok.text}
                  </span>
                ))}
                {lineIdx === renderedLines.length - 1 && !isFinished && (
                  <span className="editor-cursor" />
                )}
              </span>
            </div>
          ))}
          {renderedLines.length === 0 && (
            <div className="code-line-row">
              <span className="ln">1</span>
              <span className="editor-cursor" />
            </div>
          )}
        </div>

        {/* Test status bar */}
        <div className={`editor-footer ${isFinished ? 'test-passed' : ''}`}>
          <div className="test-status">
            {isFinished ? (
              <span className="pass-text">
                <CheckCircle2 size={13} className="pass-icon" /> 8/8 tests passing
              </span>
            ) : (
              <span className="testing-text">
                <span className="testing-spinner" /> Running test suite...
              </span>
            )}
          </div>
          <div className="viewers">
            <span className="viewers-dot" />
            {viewers} watching
          </div>
        </div>
      </div>

      {/* Mini Leaderboard Ticker Floating Card */}
      <div className="sim-leaderboard-card">
        <div className="sim-lb-header">
          <div className="sim-lb-title">
            <Trophy size={13} className="trophy-icon" />
            <span>Live Solve Feed</span>
          </div>
          <span className="sim-lb-badge">ROOM #04</span>
        </div>
        <div className="sim-lb-list">
          {leaderboardRoster[leaderboardSet].map((row) => (
            <div className="sim-lb-row" key={row.name}>
              <span className="sim-lb-rank">{row.rank}</span>
              <span className="sim-lb-avatar">{row.name[0].toUpperCase()}</span>
              <div className="sim-lb-user">
                <span className="sim-lb-name">{row.name}</span>
                <span className="sim-lb-task">{row.challenge}</span>
              </div>
              <span className="sim-lb-xp">{row.xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
