::: doc-header
::: doc-eyebrow
Portfolio · DevCast · UI Overhaul · Sep 2026
:::

# UI/UX Implementation Plan

A phased plan to evolve DevCast from a competent dark SaaS to a premium,
developer-native product --- with streaming aesthetics, purposeful
motion, and editorial typography. Scope: Landing page, Login, Signup.

::: phase-chips
[Phase 1 · Design System]{.chip .c-p1} [Phase 2 · Landing Page]{.chip
.c-p2} [Phase 3 · Auth Pages]{.chip .c-p3} [Phase 4 · Polish]{.chip
.c-p4}
:::
:::

::: section
::: sec-label
Current state
:::

## What\'s working, what isn\'t

Honest read of the screenshots before making any changes.

::: audit-grid
::: audit-col
### Keeping {#keeping .ok-head}

-   Dark theme with high text contrast --- solid baseline
-   Hero layout structure: left text, right visual panel
-   The four-column feature card grid --- good bones
-   Session card design and image thumbnails in dashboard
-   Sidebar + main content layout inside the app
-   The \"Build in public. Learn in motion.\" copy --- keep it
:::

::: audit-col
### Replacing {#replacing .bad-head}

-   Hero feels generic --- the code editor screenshot is static, dead
    weight
-   Background has no texture or depth --- it\'s flat dark, not
    intentional
-   Purple gradient blob on login left panel --- 2022 SaaS look
-   Stats bar is static numbers, no motion to reinforce \"live\" product
-   CTA section (\"Start building in public\" card) is the weakest
    section
-   Teal accent competes with the purple --- two accent families, no
    hierarchy
-   Feature card icons are small and forgettable
-   Login page has no animation in the left panel --- no energy
:::
:::
:::

------------------------------------------------------------------------

::: section
::: sec-label
Direction
:::

## Design principles for this overhaul

Four constraints that every decision should pass through.

::: principles
::: principle
::: principle-title
One animation set piece per page
:::

The landing page gets one hero animation (the stream simulator). The
login page gets one (the terminal panel). Nothing else moves unprompted.
Motion that answers a user action is welcome everywhere.
:::

::: principle
::: principle-title
Developer-authentic texture
:::

Code, terminals, and streams are the product --- the UI should feel
native to that world. Real-looking code, monospace labels where they
make sense, grid backgrounds, live indicators that mean something.
:::

::: principle
::: principle-title
One accent, two semantic colors
:::

Single primary accent: violet (#7c3aed). Red (#ef4444) exclusively for
LIVE status. Green (#22c55e) exclusively for success/pass. Never
competing accents in a single view, never rainbow.
:::

::: principle
::: principle-title
Typography does the heavy lifting
:::

Big, tight, confident headlines. The current hero type is too
conservative at this viewport. Scale display type to 72--80px on
desktop, --4% letter-spacing. Decorations come down when type goes up.
:::
:::

::: {style="margin-bottom: 24px;"}
### Reference breakdown --- use what, for what {#reference-breakdown-use-what-for-what style="font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--tx);"}

::: refs-grid
::: ref-card
::: ref-name
Aceternity UI
:::

::: ref-use
Dot/grid background for hero section. Spotlight hover on feature cards.
Beam sweep for the CTA section.
:::
:::

::: ref-card
::: ref-name
Magic UI
:::

::: ref-use
Animated number ticker for the stats bar. Seamless marquee for the
social proof scroll. One-time, stops when done.
:::
:::

::: ref-card
::: ref-name
shadcn/ui (keep)
:::

::: ref-use
All form primitives --- inputs, buttons, badges. Update CSS variables
only. Don\'t rip it out.
:::
:::

::: ref-card
::: ref-name
Linear / Vercel aesthetic
:::

::: ref-use
The target feel. True black, sharp 1px borders, editorial type weight.
Not a library --- an aesthetic to match.
:::
:::

::: ref-card
::: ref-name
Cruip Dark Template
:::

::: ref-use
Landing page section cadence, navbar blur-on-scroll pattern, CTA section
layout. Study the rhythm.
:::
:::

::: ref-card
::: ref-name
React Bits
:::

::: ref-use
Typewriter hook for the hero subtitle. Count-up for stats. Lightweight,
composable primitives.
:::
:::
:::
:::

::: avoid-box
::: avoid-label
Patterns to avoid
:::

::: avoid-grid
-   Glassmorphism (blurred backdrop + white border)
-   Neon glow on elements that aren\'t LIVE indicators
-   Three or more gradient colors competing on one screen
-   Floating blob shapes in any background
-   Fade-and-slide-up entrance on every card and section

```{=html}
<!-- -->
```
-   Animated gradient as a hero background
-   Particle fields, canvas starfields
-   Pill-shaped CTA buttons (too bubbly for a dev tool)
-   Multiple font families (more than two total)
-   Shadcn dark theme out of the box --- too neutral as-is
:::
:::
:::

------------------------------------------------------------------------

::: section
::: sec-label
Design system
:::

## Color, type, and motion tokens

### Color palette {#color-palette style="font-size: 13px; font-weight: 600; color: var(--t2); margin-bottom: 14px;"}

::: palette
::: swatch
::: {.swatch-color style="background:#0a0a0a; border:1px solid #1a1a1a;"}
:::

::: swatch-info
::: swatch-name
Background
:::

::: swatch-hex
#0a0a0a
:::

::: swatch-role
Page base --- true black
:::
:::
:::

::: swatch
::: {.swatch-color style="background:#111111;"}
:::

::: swatch-info
::: swatch-name
Surface
:::

::: swatch-hex
#111111
:::

::: swatch-role
Cards, sidebar bg
:::
:::
:::

::: swatch
::: {.swatch-color style="background:#7c3aed;"}
:::

::: swatch-info
::: swatch-name
Accent
:::

::: swatch-hex
#7c3aed
:::

::: swatch-role
Primary CTAs only
:::
:::
:::

::: swatch
::: {.swatch-color style="background:#ef4444;"}
:::

::: swatch-info
::: swatch-name
Live
:::

::: swatch-hex
#ef4444
:::

::: swatch-role
LIVE badge, only
:::
:::
:::

::: swatch
::: {.swatch-color style="background:#22c55e;"}
:::

::: swatch-info
::: swatch-name
Success
:::

::: swatch-hex
#22c55e
:::

::: swatch-role
Tests pass, XP gain
:::
:::
:::

::: swatch
::: {.swatch-color style="background:#a78bfa;"}
:::

::: swatch-info
::: swatch-name
Code
:::

::: swatch-hex
#a78bfa
:::

::: swatch-role
Keywords, mono labels
:::
:::
:::

::: swatch
::: {.swatch-color style="background:#888888;"}
:::

::: swatch-info
::: swatch-name
Secondary text
:::

::: swatch-hex
#888888
:::

::: swatch-role
Body copy, captions
:::
:::
:::

::: swatch
::: {.swatch-color style="background:#1a1a1a; border:1px solid #2a2a2a;"}
:::

::: swatch-info
::: swatch-name
Border
:::

::: swatch-hex
#1a1a1a → #2a2a2a
:::

::: swatch-role
Default → hover state
:::
:::
:::
:::

### Typography scale {#typography-scale style="font-size: 13px; font-weight: 600; color: var(--t2); margin: 28px 0 0;"}

::: type-table
::: type-row
::: type-meta
Display\
72--80px · 800\
Inter
:::

::: {.type-demo style="font-size: 38px; font-weight: 800; letter-spacing: -.04em; line-height: 1.05;"}
Build in public.
:::
:::

::: type-row
::: type-meta
Hero H2\
48px · 700\
Inter
:::

::: {.type-demo style="font-size: 26px; font-weight: 700; letter-spacing: -.03em; line-height: 1.1;"}
The room is live.
:::
:::

::: type-row
::: type-meta
Section\
30px · 600\
Inter
:::

::: {.type-demo style="font-size: 20px; font-weight: 600; letter-spacing: -.02em;"}
Live Sessions
:::
:::

::: type-row
::: type-meta
Body\
15px · 400\
Inter
:::

::: {.type-demo style="font-size: 14px; color: var(--t2);"}
Watch real developers solve real problems, then open the editor and make
the next move yourself.
:::
:::

::: type-row
::: type-meta
Mono label\
11px · 600\
JetBrains Mono
:::

::: {.type-demo style="font-family: var(--mono); font-size: 11px; letter-spacing: .06em; color: var(--code);"}
live developer network
:::
:::
:::

### Motion system --- three tiers {#motion-system-three-tiers style="font-size: 13px; font-weight: 600; color: var(--t2); margin: 28px 0 0;"}

::: motion-grid
::: motion-card
::: motion-type
Ambient (set pieces)
:::

::: motion-name
Always-on, looping
:::

::: motion-spec
Used for: Hero stream\
Login left panel\
duration: loop\
trigger: page load
:::
:::

::: motion-card
::: motion-type
Scroll-triggered
:::

::: motion-name
Once, then stops
:::

::: motion-spec
Used for: stat counters\
easing: ease-out\
duration: 1.2s\
trigger: IntersectionObserver
:::
:::

::: motion-card
::: motion-type
Interactive
:::

::: motion-name
User-triggered only
:::

::: motion-spec
Used for: hover, focus\
duration: 150ms\
easing: ease\
no auto-play ever
:::
:::
:::
:::

------------------------------------------------------------------------

::: section
::: sec-label
Landing page
:::

## Component-by-component changes

Every section of the public marketing page, with specific instructions
and the reasoning behind each change.

::: comp-block
::: comp-header
[\<Navbar /\>]{.comp-name} [Phase 2]{.chip .c-p2}
:::

-   Default state: fully transparent, no background. On scroll past
    60px:
    `background: rgba(10,10,10,0.85); backdrop-filter: blur(12px);` with
    CSS transition 200ms
-   Replace the current box-shadow with a single
    `border-bottom: 1px solid #1a1a1a` (only visible post-scroll)
-   Logo: Keep the DevCast wordmark. Remove any gradient on the text.
    Use Inter 700, tight tracking
-   Nav links: 14px, color #888, `transition: color 180ms` to #f0f0f0 on
    hover. No underline, no background pill
-   Add a live indicator between \"Community\" and \"Log in\":
    `● 12 live` --- red dot (pulse animation), monospace 11px. Pulls
    real session count from your existing store
-   CTA button: solid #7c3aed, 6px border-radius (not pill),
    `hover: filter: brightness(1.12)`. Remove the arrow icon or replace
    with →
:::

::: comp-block
::: comp-header
[\<Hero /\>]{.comp-name} [Phase 2]{.chip .c-p2}
:::

-   Background: Remove solid dark. Replace with CSS dot grid:
    `radial-gradient(circle, #1e1e1e 1px, transparent 1px)` at 28px ×
    28px. Fade it out at edges with a radial mask
-   Headline: Scale to 72px desktop, 48px tablet, 36px mobile.
    Letter-spacing --4%. \"Build in public.\" on one line (white). Below
    it: typewriter cycling through \"Learn in motion.\" / \"Ship in the
    open.\" / \"Code with 8,400 developers.\" --- 80ms/char, 2.5s pause,
    then erase and next
-   Body text: Current copy is good, keep it. No changes needed
-   CTA row: \"Start building\" (solid violet button) + \"Explore
    streams\" as plain text link, underline on hover only. No icon on
    the text link
-   Aceternity spotlight: on-cursor `radial-gradient` that follows
    pointer position --- only activated on desktop, skipped on touch
    devices via CSS media query
-   Right panel: Replace the static screenshot with the stream simulator
    animation (see spec below). No browser chrome frame needed --- just
    the inner editor

::: anim-spec
::: anim-spec-label
[ANIMATION SPEC]{.anim-badge} [Hero --- Stream Simulator (the page\'s
one set piece)]{.anim-title}
:::

::: anim-body
::: mock-editor
::: editor-chrome
::: dots
::: {.dot .dot-r}
:::

::: {.dot .dot-y}
:::

::: {.dot .dot-g}
:::
:::

[solution.ts]{.editor-file} [● LIVE]{.live-badge}
:::

::: editor-code
::: cl
[1]{.ln}[function ]{.kw}[twoSum]{.cf}(nums: [number]{.ty}\[\], target:
[number]{.ty}) {
:::

::: cl
[2]{.ln} [const]{.kw} map = [new]{.kw} Map();
:::

::: cl
[3]{.ln} [for]{.kw} ([const]{.kw} \[i, n\] [of]{.kw} nums.entries()) {
:::

::: cl
[4]{.ln} [if]{.kw} (map.has(target - n)) [return]{.kw}[\|]{.cu}
:::
:::

::: editor-footer
[✓ 8/8 tests passing]{.pass} [● 247 watching]{.viewers}
:::
:::

::: anim-notes
-   **Code typing:** JS interval at 55ms/char. After completion, show
    \"8/8 tests passing\" with green flash, pause 3s, then reset and
    repeat
-   **Viewer count:** Ticks up by +1 to +4 every 3--7s (randomized).
    Just a number update in state, no animation
-   **Cursor:** CSS `animation: blink 1s step-end infinite` --- no JS
-   **Below editor:** Three leaderboard rows auto-cycling --- CSS
    animation, names swap every 4s
-   **No scroll trigger:** Starts on page load immediately. It\'s the
    hero --- it should be running when the user lands
-   **Reduced motion:** Replace entire animation with a static
    screenshot under `prefers-reduced-motion`
:::
:::
:::
:::

::: comp-block
::: comp-header
[\<StatsBar /\>]{.comp-name} [Phase 2]{.chip .c-p2}
:::

-   Numbers: Use Magic UI or a custom `useCountUp` hook --- count from 0
    to final value when the bar scrolls into view. Fires once, never
    again (IntersectionObserver with `{ once: true }`)
-   Layout: Three stats, full-width, horizontal borders above and below
    only (no pipe dividers). More breathing room between each stat
-   Below the stats: A slow-scrolling marquee (40s loop) ---
    \"mira.codes earned 2,840 XP · sanjay.dev solved Graphs BFS in 7min
    · lena_loop streamed 2h today ·\" --- duplicated for seamless scroll
-   Marquee CSS only:
    `@keyframes marquee { from {transform:translateX(0)} to {transform:translateX(-50%)} }`
    on a doubled string. Pause on hover
:::

::: comp-block
::: comp-header
[\<FeaturesGrid /\>]{.comp-name} [Phase 2]{.chip .c-p2}
:::

-   Eyebrow label: \"WHY DEVCAST\" --- change color from teal to
    `#a78bfa` (code purple). Keep the uppercase monospace style since
    it\'s appropriate for a dev tool and contextually earned here
-   Cards: Remove current rounded-dark style. New: 1px border #1a1a1a,
    border-radius 6px, background #111111
-   Card hover: border transitions to #333333, `translateY(-2px)` 150ms
    ease. No scale, no glow, no shadow
-   Spotlight hover: On desktop, add an Aceternity-style
    cursor-following radial gradient inside each card
    (`background: radial-gradient(400px at var(--mouse-x) var(--mouse-y), rgba(124,58,237,.08), transparent)`).
    Track `onMouseMove` per card
-   Icons: Replace with Phosphor Icons (duotone). Larger --- 40px, not
    20px. Wrap in a 56×56 container with #161616 background and 1px
    border #1a1a1a
-   No scroll-triggered entrance animations. Cards are visible from
    load. The spotlight on hover is the interaction reward
:::

::: comp-block
::: comp-header
[\<CTASection /\>]{.comp-name} [Phase 2]{.chip .c-p2}
:::

-   Current: A purple card with border-radius --- visually it\'s just a
    box at the bottom of the page. Too contained
-   New: Full-bleed section edge to edge, no card container. Background
    stays #0a0a0a with the dot grid texture, same as hero
-   Aceternity beam effect: A single horizontal light beam sweeps from
    left to right, looping --- subtle, 8s duration. This is the
    section\'s ambient motion
-   Headline: Larger, centered --- \"Your next session starts here.\"
    Same Inter 700, 48px
-   Below: A row of 5 avatar circles + \"Join 8,420+ developers building
    live\" --- real social proof, not a decorative row
-   Two CTAs: \"Get started\" (solid violet) + \"I already have an
    account\" (plain text link). No card, no border around the
    two-button row
:::
:::

------------------------------------------------------------------------

::: section
::: sec-label
Auth pages
:::

## Login and Signup redesign

The login page is where a returning user\'s first impression of the
product lives. It should feel like entering a studio --- not a generic
SaaS form.

::: comp-block
::: comp-header
[\<LoginPage /\>]{.comp-name} [Phase 3]{.chip .c-p3}
:::

-   Layout: Keep 60/40 split. Left: animated panel. Right: clean form.
    No changes to the split concept
-   Left panel: Remove purple blob gradient entirely. Background: true
    #0a0a0a with dot grid. This panel is where the page\'s animation
    lives
-   Right panel: #0f0f0f, separated by a single 1px left border. Form
    fields float on dark --- no white card background, no border-radius
    card
-   Form inputs: shadcn Input component, border #1a1a1a, on focus: 2px
    solid #7c3aed ring. Keep \"Email\" and \"Password\" as label text,
    not placeholder-only
-   \"Enter DevCast\" button: full width, solid #7c3aed, 6px
    border-radius, Inter 600 15px
-   Add \"Continue with GitHub\" above the email form --- essential for
    a developer-facing product. Ghost button style, border #1a1a1a,
    GitHub mark icon from Phosphor
-   Footer text: \"Real people. Real code. Real progress.\" --- current
    copy is good, keep it. Make it monospace, #333

::: {.anim-spec style="margin-top: 14px;"}
::: anim-spec-label
[ANIMATION SPEC]{.anim-badge} [Login Left Panel --- Terminal Stream (the
page\'s one set piece)]{.anim-title}
:::

::: anim-body
::: login-panel-mock
::: scanlines
:::

::: panel-live
::: pulse-dot
:::

LIVE NOW
:::

::: {style="font-family: var(--mono); font-size: 12px; color: var(--t2); margin-bottom: 10px;"}
React patterns with Sarah
:::

::: waveform
::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::

::: wave-bar
:::
:::

::: {style="margin: 10px 0 6px; font-family: var(--mono); font-size: 10px; color: var(--t3);"}
recent commits
:::

::: terminal-line
[\$]{.terminal-prompt} git commit -m \"fix: useEffect cleanup\"
:::

::: terminal-line
[✓]{.terminal-out} 3 tests passed
:::

::: terminal-line
[\$]{.terminal-prompt} git push origin main[\|]{.cu}
:::

::: {style="margin: 10px 0 6px; font-family: var(--mono); font-size: 10px; color: var(--t3);"}
chat
:::

::: chat-line
[mira.codes:]{.chat-user} [the useMemo here is key]{.chat-msg}
:::

::: chat-line
[sanjay.dev:]{.chat-user} [finally clicked for me 🎯]{.chat-msg}
:::

::: chat-line
[lena_loop:]{.chat-user} [+120 XP on that one]{.chat-msg}
:::
:::

::: anim-notes
-   **Waveform:** CSS `@keyframes` only --- 10 bars, each with different
    height and animation-delay. No JS, no canvas
-   **Live pulse dot:** `box-shadow: 0 0 0 4px rgba(239,68,68,0)`
    pulsing outward. CSS only
-   **Terminal lines:** Typed one by one on load using a small JS
    interval. After last line, clear and replay with new commit messages
-   **Chat messages:** Fixed array of messages, each `opacity: 0` → 1 →
    0 on staggered CSS animation. Seamless loop. \~15 messages total,
    rotating
-   **Scanlines:** CSS `repeating-linear-gradient` overlay at 3% opacity
    --- gives a subtle screen quality without being a cliché effect
-   **Reduced motion:** Static state --- waveform flat, terminal shown
    in full, no chat animation
:::
:::
:::
:::

::: {.comp-block style="margin-top: 20px;"}
::: comp-header
[\<SignupPage /\>]{.comp-name} [Phase 3]{.chip .c-p3}
:::

-   Same split-screen layout as login. Left panel: adapt the animation
    to show \"Session starting...\" --- a fresh terminal state, not a
    live session
-   Form: Name, Username (monospace preview of their future handle),
    Email, Password. Username field shows `@username` in monospace as a
    prefix
-   Below the form: 3 short lines --- \"Access 18,600+ past challenges\"
    / \"Track XP and leaderboard rank\" / \"Stream your own sessions\"
    --- plain text, 13px, #888
-   Same GitHub OAuth button at top --- keep it consistent with login
-   No email verification wall on first load --- onboard them
    immediately, verify async
:::
:::

------------------------------------------------------------------------

::: section
::: sec-label
Implementation details
:::

## Critical code patterns

The three implementation details that make or break the design ---
everything else is standard React/Tailwind.

::: comp-block
### 1. Dot grid background (reusable) {#dot-grid-background-reusable style="font-size: 13px; font-weight: 600; color: var(--t2); margin-bottom: 10px;"}

::: code-block
::: code-header
DotGrid.css
:::

::: code-body
[.dot-grid]{.ck} { background-image: radial-gradient( circle,
[#1e1e1e]{.cs} [1px]{.cn}, transparent [1px]{.cn} ); background-size:
[28px 28px]{.cn}; [/\* Fade toward edges with a radial mask \*/]{.cc}
-webkit-mask-image: radial-gradient( ellipse [80%]{.cn} [80%]{.cn} at
[50%]{.cn} [50%]{.cn}, black [40%]{.cn}, transparent [100%]{.cn} ); }
:::
:::
:::

::: {.comp-block style="margin-top: 20px;"}
### 2. Typewriter hook for hero subtitle {#typewriter-hook-for-hero-subtitle style="font-size: 13px; font-weight: 600; color: var(--t2); margin-bottom: 10px;"}

::: code-block
::: code-header
useTypewriter.ts
:::

::: code-body
[const]{.ck} phrases = \[ [\"Learn in motion.\"]{.cs}, [\"Ship in the
open.\"]{.cs}, [\"Code with 8,400 developers.\"]{.cs} \];
[function]{.ck} [useTypewriter]{.cf}(phrases, speed = [60]{.cn}) {
[const]{.ck} \[display, setDisplay\] = useState([\"\"]{.cs});
[const]{.ck} \[index, setIndex\] = useState([0]{.cn}); useEffect(() =\>
{ [let]{.ck} i = [0]{.cn}, typing = [true]{.ck}; [const]{.ck} tick =
setInterval(() =\> { [if]{.ck} (typing) {
setDisplay(phrases\[index\].slice([0]{.cn}, ++i)); [if]{.ck} (i ===
phrases\[index\].length) { typing = [false]{.ck}; setTimeout(() =\> {
typing = [true]{.ck}; i = [0]{.cn}; }, [2500]{.cn}); } } }, speed);
[return]{.ck} () =\> clearInterval(tick); }, \[index\]); }
:::
:::
:::

::: {.comp-block style="margin-top: 20px;"}
### 3. Spotlight hover on feature cards {#spotlight-hover-on-feature-cards style="font-size: 13px; font-weight: 600; color: var(--t2); margin-bottom: 10px;"}

::: code-block
::: code-header
FeatureCard.tsx
:::

::: code-body
[function]{.ck} [FeatureCard]{.cf}({ title, desc, icon }) { [const]{.ck}
\[pos, setPos\] = useState({ x: [0]{.cn}, y: [0]{.cn} }); [return]{.ck}
( \<[div]{.cf} onMouseMove={(e) =\> { [const]{.ck} r =
e.currentTarget.getBoundingClientRect(); setPos({ x: e.clientX - r.left,
y: e.clientY - r.top }); }} style={{ background:
[\`radial-gradient(400px at [\${pos.x}]{.ck}px [\${pos.y}]{.ck}px,
rgba(124,58,237,0.08), transparent 70%)\`]{.cs} }} \> {/\* card content
\*/} \</[div]{.cf}\> ); }
:::
:::
:::
:::

------------------------------------------------------------------------

::: section
::: sec-label
Timeline
:::

## Build sequence --- 10 days

::: timeline
::: {.tl-item .active}
::: tl-days
Days 1--2 · Phase 1
:::

::: tl-head
Foundation --- design system
:::

-   Update Tailwind `theme.extend.colors` to new palette. Remove teal,
    set violet/live/ok tokens
-   Add Geist or Inter weights (700, 800) to font loading. Set
    `letter-spacing: -0.04em` defaults for display type
-   Update shadcn globals.css CSS variables to match new surface and
    border colors
-   Create reusable `DotGrid` and `SpotlightCard` components
-   Install: `framer-motion`, `@phosphor-icons/react`
:::

::: tl-item
::: tl-days
Days 3--5 · Phase 2a
:::

::: tl-head
Landing page --- hero and navbar
:::

-   Navbar: blur-on-scroll (CSS transition + scroll listener), live
    indicator, CTA button style update
-   Hero: Scale up headline type, implement `useTypewriter` hook for
    subtitle
-   Hero background: DotGrid component with radial mask fade
-   Hero right panel: Build stream simulator animation --- code typer,
    viewer counter, cursor blink
-   Spotlight effect on hero section using `onMouseMove`
:::

::: tl-item
::: tl-days
Days 6--7 · Phase 2b
:::

::: tl-head
Landing page --- stats, features, CTA
:::

-   Stats bar: `useCountUp` hook with IntersectionObserver, marquee
    ticker below
-   Features grid: Replace card styles, swap to Phosphor icons, add
    spotlight hover
-   CTA section: Remove card container, full-bleed layout, beam
    animation, avatar row
-   Mobile responsiveness pass on all landing sections
:::

::: tl-item
::: tl-days
Days 8--9 · Phase 3
:::

::: tl-head
Auth pages --- login and signup
:::

-   Login: Remove purple blob from left panel, build
    terminal+chat+waveform animation
-   Login: Right panel form --- scanline overlay, shadcn inputs with
    violet focus ring, GitHub OAuth button
-   Signup: Clone layout, adapt left panel animation, add username field
    with monospace prefix
-   Both pages: reduced-motion fallback --- static states for every
    animated element
:::

::: tl-item
::: tl-days
Day 10 · Phase 4
:::

::: tl-head
Polish and cross-cutting concerns
:::

-   Framer Motion AnimatePresence for route transitions (subtle: 200ms
    fade, not slide)
-   Performance: Ensure stream simulator uses `requestAnimationFrame`,
    not `setInterval` for the typing loop
-   Loading skeletons: Update to #161616 base, #1a1a1a shimmer ---
    matches new surface palette
-   Full-page accessibility audit: keyboard focus rings visible, ARIA
    labels on icon-only buttons
:::
:::
:::

------------------------------------------------------------------------

::: section
::: sec-label
Stack additions
:::

## What to add, what to keep

::: tech-grid
::: tech-card
::: tech-cat
Animation
:::

::: tech-name
Framer Motion
:::

::: tech-why
Route transitions and AnimatePresence. Worth the bundle for this. Use it
surgically --- not on every component.
:::
:::

::: tech-card
::: tech-cat
Icons
:::

::: tech-name
Phosphor Icons
:::

::: tech-why
Duotone variant looks premium. More expressive than Lucide for the
feature cards. Tree-shakable.
:::
:::

::: tech-card
::: tech-cat
Typography
:::

::: tech-name
Geist (Vercel)
:::

::: tech-why
Geist + Geist Mono --- open-source, developer-product feel, exactly the
right aesthetic. Free from Google Fonts.
:::
:::

::: tech-card
::: tech-cat
Keep as-is
:::

::: tech-name
shadcn/ui
:::

::: tech-why
Only update globals.css CSS variables. All component primitives stay ---
don\'t rebuild what works.
:::
:::

::: tech-card
::: tech-cat
Keep as-is
:::

::: tech-name
Tailwind CSS
:::

::: tech-why
Extend colors and add custom utilities for dot-grid and scanlines. No
version changes needed.
:::
:::

::: tech-card
::: tech-cat
Skip
:::

::: tech-name
Lottie / GSAP
:::

::: tech-why
Not needed. Every animation in this plan is achievable with CSS
keyframes + minimal JS. Don\'t add the weight.
:::
:::
:::

::: install-box
::: {.install-line .install-comment}
\# Install these two packages. Everything else is already in the
project.
:::

::: {.install-line .install-cmd}
npm install framer-motion \@phosphor-icons/react
:::

::: {.install-line .install-comment}
\# Geist --- import from Google Fonts in your CSS, or:
:::

::: {.install-line .install-cmd}
npm install geist
:::

::: {.install-line .install-comment}
\# Then in tailwind.config.ts, add the font to fontFamily.sans and
fontFamily.mono
:::
:::
:::

<div>

DevCast · UI Implementation Plan · Sep 2026

</div>

::: {style="color: var(--t3); margin-top: 4px;"}
Scope: Landing page + Auth pages · Est. 10 days · Stack: React +
Tailwind + shadcn/ui
:::
