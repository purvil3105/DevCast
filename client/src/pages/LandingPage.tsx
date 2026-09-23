import { ArrowRight, Code2, Radio, Trophy, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SpotlightCard } from '../components/landing/SpotlightCard';
import { StatsBar } from '../components/landing/StatsBar';
import { StreamSimulator } from '../components/landing/StreamSimulator';
import { useTypewriter } from '../hooks/useTypewriter';

const featureList = [
  {
    icon: Radio,
    title: 'Watch the thinking',
    desc: 'Follow architectural decisions, trade-offs, and the real debugging that happens between ideas and working code.',
  },
  {
    icon: Code2,
    title: 'Practice in the moment',
    desc: 'Jump right into the in-browser IDE, execute test suites, and receive instant automated test validation.',
  },
  {
    icon: Trophy,
    title: 'Compete & climb',
    desc: 'Turn solved challenges into verified XP on a real-time leaderboard that rewards consistency and depth.',
  },
  {
    icon: Users,
    title: 'Build in public',
    desc: 'Exchange insights in live discussion, review peer solutions, and accelerate alongside dedicated engineers.',
  },
];

const workflowSteps = [
  {
    num: '01',
    title: 'Join a live room',
    desc: 'Find an ongoing session that targets your questions or architecture challenges.',
  },
  {
    num: '02',
    title: 'Accept the prompt',
    desc: 'Open the shared workspace, run test suites, and write solutions in real-time.',
  },
  {
    num: '03',
    title: 'Climb the rankings',
    desc: 'Submit clean code, earn XP rewards, and verify your mastery on the leaderboard.',
  },
];

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Typewriter cycling phrases in hero
  const { text: typewriterText } = useTypewriter([
    'Learn in motion.',
    'Ship in the open.',
    'Code with 8,400 developers.',
  ]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const section = document.getElementById(id);
    const page = pageRef.current;
    if (section && page) {
      page.scrollTo({ top: section.offsetTop - 24, behavior: 'smooth' });
    }
    window.history.replaceState(null, '', `#${id}`);
  };

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const onScroll = () => setScrolled(page.scrollTop > 50);
    page.addEventListener('scroll', onScroll, { passive: true });
    return () => page.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-page" ref={pageRef}>
      {/* Dot Grid Background */}
      <div className="dot-grid-bg" aria-hidden="true" />

      {/* Sticky Blur Navbar */}
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="landing-brand" aria-label="DevCast Home">
          <img
            src="/logo-dark.png"
            alt="DevCast"
            className="landing-brand-logo"
            style={{ height: 32, width: 'auto', display: 'block' }}
          />
        </Link>

        <nav>
          <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>
            Features
          </a>
          <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>
            How it works
          </a>
          <a href="#community" onClick={(e) => scrollToSection(e, 'community')}>
            Community
          </a>
        </nav>

        <div className="landing-actions">
          <div className="nav-live-indicator">
            <span className="nav-live-dot" />
            <span>12 LIVE</span>
          </div>
          <Link to="/login" className="landing-login">
            Log in
          </Link>
          <Link to="/signup" className="btn-solid-primary btn-small">
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="pulse-dot" /> LIVE DEVELOPER NETWORK
            </div>

            <h1>Build in public.</h1>
            <div className="hero-subtitle-typewriter">
              <span>{typewriterText}</span>
              <span className="typewriter-cursor">|</span>
            </div>

            <p>
              Watch real developers solve real problems, then open the editor and make the next move
              yourself.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="btn-solid-primary">
                Start building <ArrowRight size={16} />
              </Link>
              <Link to="/live" className="btn-ghost-link">
                Explore streams →
              </Link>
            </div>

            <div className="hero-proof-cluster">
              <div className="avatar-stack">
                <span>M</span>
                <span>S</span>
                <span>L</span>
                <span>A</span>
              </div>
              <span>
                <strong>8,420+</strong> developers online
              </span>
              <span className="proof-divider" />
              <span>
                <strong>1,284</strong> watching now
              </span>
            </div>
          </div>

          <div className="hero-art-container">
            <StreamSimulator />
          </div>
        </section>

        {/* Stats & Infinite Marquee Section */}
        <div id="community">
          <StatsBar />
        </div>

        {/* Features Grid ("Why DevCast") */}
        <section id="features" className="landing-section">
          <span className="section-label-mono">WHY DEVCAST</span>
          <h2>The room is live. Your progress is real.</h2>
          <p className="section-lede-text">
            DevCast brings the energy of a focused engineering room into your browser: a real
            stream, an executable challenge, and a community moving together.
          </p>

          <div className="features-grid-wrapper">
            {featureList.map(({ icon: Icon, title, desc }) => (
              <SpotlightCard key={title}>
                <div className="feature-icon-container">
                  <Icon size={24} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </SpotlightCard>
            ))}
          </div>
        </section>

        {/* Workflow Strip ("How it works") */}
        <section id="how-it-works" className="workflow-section">
          <div className="workflow-container">
            <span className="section-label-mono">WORKFLOW</span>
            <h2>Three steps from observer to builder.</h2>

            <div className="workflow-steps">
              {workflowSteps.map(({ num, title, desc }) => (
                <div className="workflow-step-card" key={num}>
                  <span className="step-num-tag">{num}</span>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section (Full-bleed + Beam sweep) */}
        <section className="final-cta-section">
          <div className="cta-beam-sweep" aria-hidden="true" />
          <div className="final-cta-container">
            <span className="section-label-mono">YOUR NEXT SESSION STARTS HERE</span>
            <h2>Start building in public.</h2>
            <p>
              Bring a question. Leave with momentum. Join developers building, learning, and
              shipping in real time.
            </p>

            <div className="cta-social-proof">
              <div className="avatar-stack">
                <span>M</span>
                <span>S</span>
                <span>L</span>
                <span>A</span>
              </div>
              <span>Join 8,420+ developers building live</span>
            </div>

            <div className="final-cta-actions">
              <Link to="/signup" className="btn-solid-primary">
                Get started <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-ghost-link">
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="landing-footer">
        <Link to="/" className="landing-footer-brand" aria-label="DevCast Home">
          <img
            src="/logo-dark.png"
            alt="DevCast"
            className="landing-footer-logo"
            style={{ height: 28, width: 'auto', display: 'block' }}
          />
        </Link>

        <span>Live coding · Real learning · Verifiable progress</span>

        <div className="landing-footer-links">
          <Link to="/live">Browse streams</Link>
          <Link to="/challenges">Challenges</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </div>
      </footer>
    </div>
  );
}
