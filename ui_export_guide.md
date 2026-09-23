# DevCast UI Design System & Export Guide

This guide breaks down DevCast's design system themes (Light and Dark mode) and extracts the landing page components so you can seamlessly port this UI to another application.

## 1. UI Design Themes (Context & Philosophy)

DevCast's design is heavily CSS-token driven, favoring a "deep dark IDE" native look with a first-class Light Theme. It relies strongly on structural ramps (varying shades of gray/indigo) and a primary accent gradient (violet to cyan).

### Theming Rules:
- **Structural Ramp:** `950` is the deepest background (page), `900` for surfaces/cards, and `800`/`700` for borders and hover states. Brightest text is on `300`/`200`. 
- **Light Theme Strategy:** Rather than blindly inverting colors, the light theme overrides semantic roles. Borders are explicitly kept visible (`#e4e5ee`), and cards use stark white (`#ffffff`) over a slightly tinted page background (`#f4f5fa`) to create depth without relying heavily on shadows.
- **Accents:** Cyan is used as the "Live Signal" (activity, real-time data), while Violet/Indigo represents brand structure and primary actions.

### CSS Design Tokens
Include these at the root of your global CSS (e.g., `index.css`).

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');

/* ─── Design Tokens · Dark (default) ─────────────────────── */
:root {
  --gray-950: #0b0b14;
  --gray-900: #14141f;
  --gray-800: #26263a;
  --gray-700: #34344c;
  --gray-600: #45455f;
  --gray-500: #64748b;
  --gray-400: #94a3b8;
  --gray-300: #cbd2de;
  --gray-200: #f1f5f9;

  --bg-elevated: #1c1c2b;
  --bg-overlay: #242438;

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);
  --border-brand: rgba(139, 92, 246, 0.38);
  --hover-bg: rgba(255, 255, 255, 0.045);

  --indigo-800: #5b21b6;
  --indigo-700: #6d28d9;
  --indigo-600: #7c3aed;
  --indigo-500: #8b5cf6;
  --indigo-400: #a78bfa;
  --indigo-300: #c4b5fd;
  --indigo-900-20: rgba(124, 58, 237, 0.16);
  --indigo-500-10: rgba(139, 92, 246, 0.10);
  --indigo-500-20: rgba(139, 92, 246, 0.20);
  --indigo-500-30: rgba(139, 92, 246, 0.32);

  --cyan: #22d3ee;
  --cyan-light: #67e8f9;
  --cyan-10: rgba(34, 211, 238, 0.10);
  --cyan-20: rgba(34, 211, 238, 0.20);

  --grad-brand: linear-gradient(135deg, var(--indigo-500) 0%, var(--cyan) 100%);
  --grad-brand-strong: linear-gradient(135deg, var(--indigo-600) 0%, var(--cyan) 100%);

  /* Status Colors */
  --red-500: #ef4444; --red-400: #f87171;
  --green-500: #10b981; --green-400: #34d399;
  --yellow-500: #f59e0b; --yellow-400: #fbbf24;

  --editor-bg: #0d1117;
  --editor-gutter: #090c10;
  
  --text-main: #f1f5f9;
  --text-inverse: #0b0b14;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* Shadows */
  --shadow-md: 0 10px 30px rgba(0, 0, 0, 0.38);
  --shadow-lg: 0 24px 56px rgba(0, 0, 0, 0.55);
  --glow-violet: 0 8px 30px rgba(124, 58, 237, 0.38);
  --glow-cyan: 0 0 22px rgba(34, 211, 238, 0.25);
  
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

/* ─── Design Tokens · Light ────────────────────────────── */
:root.light-theme {
  --gray-950: #f4f5fa; 
  --gray-900: #ffffff; 
  --gray-800: #e4e5ee; 
  --gray-700: #d2d4e0; 
  --gray-600: #b7bacb;
  --gray-500: #6b7280; 
  --gray-400: #555b6e; 
  --gray-300: #2b2e3c; 
  --gray-200: #131624; 

  --bg-elevated: #eef0f6;
  --bg-overlay: #ffffff;

  --border: rgba(15, 16, 30, 0.10);
  --border-strong: rgba(15, 16, 30, 0.16);
  --border-brand: rgba(124, 58, 237, 0.35);
  --hover-bg: rgba(15, 16, 30, 0.045);

  --indigo-800: #4c1d95; --indigo-700: #5b21b6;
  --indigo-600: #7c3aed; --indigo-500: #6d28d9;
  --indigo-400: #7c3aed;
  
  --cyan: #0891b2; --cyan-light: #06b6d4;
  --green-500: #059669; --green-400: #10b981;
  --yellow-500: #d97706;

  --editor-bg: #ffffff;
  --editor-gutter: #f4f5fa;
  --text-main: #131624;
  --text-inverse: #ffffff;

  --shadow-md: 0 8px 24px rgba(15, 16, 30, 0.10);
  --shadow-lg: 0 24px 48px rgba(15, 16, 30, 0.14);
  --glow-violet: 0 8px 26px rgba(124, 58, 237, 0.22);
  --glow-cyan: 0 0 20px rgba(8, 145, 178, 0.18);
}
```

---

## 2. Landing Page Component (`LandingPage.tsx`)

The landing page leverages utility classes and standard Lucide-react icons heavily. It is built to seamlessly blend the structural tokens above.

```tsx
import { ArrowRight, BookOpen, Code2, Eye, Radio, Trophy, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { CodeEditorMock } from '../components/landing/CodeEditorMock';
import { TopBuildersCard } from '../components/landing/TopBuildersCard';
import { useReveal } from '../hooks/useReveal';

const features = [
  [Radio, 'Watch the thinking', 'Follow decisions, tradeoffs, and the messy middle of making something work.'], 
  [Code2, 'Practice in the moment', 'Open the editor, test your ideas, and get immediate feedback while context is fresh.'], 
  [Trophy, 'Compete & climb', 'Turn solved challenges into momentum on a leaderboard that rewards consistency.'], 
  [Users, 'Grow together', 'Compare progress, celebrate wins, and learn from builders on the same path.']
];

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [revealRoot, setRevealRoot] = useState<Element | null>(null);

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => { 
    event.preventDefault(); 
    const section = document.getElementById(id); 
    const page = pageRef.current; 
    if (section && page) page.scrollTo({ top: section.offsetTop - 24, behavior: 'smooth' }); 
    window.history.replaceState(null, '', `#${id}`); 
  };

  useEffect(() => { 
    const page = pageRef.current; 
    if (!page) return; 
    setRevealRoot(page); 
    const onScroll = () => setScrolled(page.scrollTop > 18); 
    page.addEventListener('scroll', onScroll, { passive: true }); 
    return () => page.removeEventListener('scroll', onScroll); 
  }, []);

  const hero = useReveal<HTMLDivElement>(revealRoot); 
  const feature = useReveal<HTMLElement>(revealRoot, 80); 
  const how = useReveal<HTMLElement>(revealRoot, 120); 
  const proof = useReveal<HTMLElement>(revealRoot, 160);

  return (
    <div className="landing-page" ref={pageRef}>
      <div className="landing-grid" />
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="landing-brand">
          <img src="/icon.png" alt="DevCast" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/devcast-logo.png'; }} />
          <span>Dev<span>Cast</span></span>
        </Link>
        <nav>
          <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Features</a>
          <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>How it works</a>
          <a href="#community" onClick={(e) => scrollToSection(e, 'community')}>Community</a>
        </nav>
        <div className="landing-actions">
          <Link to="/login" className="landing-login">Log in</Link>
          <Link to="/signup" className="button button-small">Get started <ArrowRight size={15} /></Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className={`hero-copy reveal ${hero.inView ? 'in-view' : ''}`} ref={hero.ref} style={hero.style}>
            <div className="landing-kicker"><span className="signal-dot" /> LIVE DEVELOPER NETWORK</div>
            <h1>Build in public.<br /><em>Learn in motion.</em></h1>
            <p>Watch real developers solve real problems, then open the editor and make the next move yourself.</p>
            <div className="hero-actions">
              <Link to="/signup" className="button">Start building <ArrowRight size={18} /></Link>
              <Link to="/live" className="text-link">Explore streams <Eye size={16} /></Link>
            </div>
            <div className="hero-proof">
              <span className="avatar-cluster"><i>m</i><i>s</i><i>l</i></span>
              <span><strong>8,420+</strong> developers online</span>
              <span className="watching"><strong>1,284</strong> watching now</span>
            </div>
          </div>
          <div className="hero-art">
            <CodeEditorMock />
            <TopBuildersCard />
            <div className="challenge-chip"><BookOpen size={14} /> Challenge unlocked <b>+120 xp</b></div>
          </div>
        </section>

        {/* ... Rest of features and CTA omitted for brevity in snippets (refer to source file LandingPage.tsx) ... */}
        
      </main>
    </div>
  );
}
```

---

## 3. Supplementary Hero Art Components

The landing page displays floating cards to simulate live interactions.

### `CodeEditorMock.tsx`
```tsx
import { CheckCircle2, Circle } from 'lucide-react';

const code = [
  ['keyword', 'function'], ['plain', ' solveChallenge(input) {'],
  ['plain', '  const tokens = input.trim().split(" ");'],
  ['keyword', '  return'], ['plain', ' tokens.filter(Boolean).length;'], ['plain', '}'],
];

export function CodeEditorMock() {
  return (
    <div className="code-editor-mock" aria-label="Live coding challenge preview">
      <div className="editor-topbar">
        <span className="traffic-lights"><i /><i /><i /></span>
        <span className="editor-tab"><Circle size={10} /> devcast.cpp</span>
        <span className="live-badge"><span className="dot" /> LIVE</span>
      </div>
      <div className="editor-body">
        {code.map(([kind, line], index) => (
          <div className="code-line" key={`${line}-${index}`}>
            <span className="line-number">{index + 1}</span>
            <span className={kind}>{line}</span>
          </div>
        ))}
      </div>
      <div className="editor-status">
        <span><CheckCircle2 size={14} /> 8/8 passed</span>
        <span className="compile-track"><i /></span>
        <span>running tests...</span>
      </div>
    </div>
  );
}
```

### `TopBuildersCard.tsx`
```tsx
import { Trophy } from 'lucide-react';

const builders = [
  ['01', 'mira.codes', '2,840 xp'], 
  ['02', 'sanjay.dev', '2,410 xp'], 
  ['03', 'lena_loop', '2,195 xp']
];

export function TopBuildersCard() {
  return (
    <div className="top-builders-card">
      <div className="builders-heading">
        <span><Trophy size={15} /> Top builders</span>
        <small>this week</small>
      </div>
      {builders.map(([rank, name, score]) => (
        <div className="builder-row" key={name}>
          <b>{rank}</b>
          <span className="builder-avatar">{name[0].toUpperCase()}</span>
          <strong>{name}</strong>
          <small>{score}</small>
        </div>
      ))}
    </div>
  );
}
```

## Setup Instructions for the new Application

1. **Variables:** Add the `:root` and `:root.light-theme` variables from step 1 into your new global CSS file.
2. **Global Components:** Copy the standard `.button`, `.landing-page`, and specific `.code-editor-mock` styling from `client/src/index.css` directly into your CSS system.
3. **UI Migration:** Take `LandingPage.tsx` and the `landing` components and plug them into your router. You'll need `lucide-react` for the icons and `react-router-dom` (or swap with `next/link` depending on your new stack).
