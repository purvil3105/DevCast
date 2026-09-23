import { useCountUp } from '../../hooks/useCountUp';

const tickerItems = [
  'mira.codes earned +240 XP on Binary Trees',
  'sanjay.dev solved Graphs BFS in 7min',
  'lena_loop streamed 2h of System Design',
  'alex_k deployed real-time WebSocket room',
  'dev_dan completed Two Sum in 4min',
  'elena.ts unlocked "Algorithm Master" badge',
  'marcus_v reached Top 10 Leaderboard',
  'kai.rs solved LRU Cache with zero hints',
];

export function StatsBar() {
  const [devsCount, devsRef] = useCountUp(8420, { duration: 1600 });
  const [practiceCount, practiceRef] = useCountUp(24, { duration: 1200 });
  const [solvedCount, solvedRef] = useCountUp(18642, { duration: 1800 });

  return (
    <section className="stats-bar-section">
      <div className="stats-bar-container">
        <div className="stat-col" ref={devsRef}>
          <div className="stat-number">
            {devsCount.toLocaleString()}<span className="stat-plus">+</span>
          </div>
          <div className="stat-label">developers online</div>
        </div>

        <div className="stat-col" ref={practiceRef}>
          <div className="stat-number">
            {practiceCount}/7
          </div>
          <div className="stat-label">live practice rooms</div>
        </div>

        <div className="stat-col" ref={solvedRef}>
          <div className="stat-number">
            {solvedCount.toLocaleString()}
          </div>
          <div className="stat-label">challenges solved</div>
        </div>
      </div>

      {/* Marquee ticker below stats */}
      <div className="activity-marquee-wrap">
        <div className="activity-marquee">
          {/* Duplicated track for seamless infinite loop */}
          <div className="marquee-track">
            {tickerItems.map((item, idx) => (
              <span className="marquee-item" key={`a-${idx}`}>
                <span className="marquee-dot">●</span>
                {item}
              </span>
            ))}
          </div>
          <div className="marquee-track" aria-hidden="true">
            {tickerItems.map((item, idx) => (
              <span className="marquee-item" key={`b-${idx}`}>
                <span className="marquee-dot">●</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
