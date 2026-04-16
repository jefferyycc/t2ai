# t2ai Design System

AI fitness coach. The design should feel like a high-end developer tool that happens to be about training — precise, restrained, and confident. Inspired by Vercel's engineering-grade minimalism, adapted for a fitness context with a single teal accent that signals health and movement.

## 1. Visual Theme & Atmosphere

The interface is overwhelmingly white with near-black text — a gallery-like emptiness where every element earns its pixels. This is not a flashy fitness app with gradients and energy. It is a coaching tool: calm, authoritative, structured.

Cards use shadow-as-border (`box-shadow: 0px 0px 0px 1px`) instead of traditional CSS borders — allowing smoother transitions, better rounded corners, and subtler visual weight. Depth comes from layered shadow stacks, not color variation.

Typography uses Inter (the open-source Geist alternative) with negative letter-spacing at display sizes, creating compressed headlines that feel engineered. Mono text (JetBrains Mono or SF Mono) appears for labels, metadata, and status indicators — the "coach's console" voice.

**Key Characteristics:**
- Inter with negative letter-spacing at display sizes (-0.04em to -0.06em)
- Monospace uppercase for labels, status, and metadata
- Shadow-as-border technique replaces traditional CSS borders
- Multi-layer shadow stacks for nuanced card depth
- Near-pure white canvas with `#0f1419` text
- Single accent color: Coach Teal (`#167c80`) — used only for actions and active states
- Focus ring: `hsla(176, 70%, 36%, 0.5)` — teal-derived for accessibility
- Pill badges (9999px radius) for status indicators

## 2. Color Palette & Roles

### Primary
- **Ink** (`#0f1419`): Primary text, headings. Not pure black — micro-warmth prevents harshness.
- **Canvas** (`#ffffff`): Page background, card surfaces, button text on dark.
- **Paper** (`#fafbfc`): Subtle surface tint, page-level background gradient.

### Accent
- **Coach Teal** (`#167c80`): Primary actions, active states, links. The single brand color.
- **Coach Teal Dark** (`#0f5a5d`): Hover/pressed state for teal elements.
- **Coach Teal Light** (`#e6f5f5`): Tinted backgrounds for active cards, selected states.

### Semantic
- **Success** (`#16a34a`): Completed workouts, good form scores (80+), positive feedback.
- **Warning** (`#d97706`): Partial issues, moderate form scores (60-80), attention needed.
- **Danger** (`#dc2626`): Poor form, errors, scores below 60.

### Neutral Scale
- **Gray 900** (`#0f1419`): Primary text, headings.
- **Gray 600** (`#4b5563`): Secondary text, descriptions.
- **Gray 500** (`#6b7280`): Tertiary text, placeholders.
- **Gray 400** (`#9ca3af`): Disabled text, decorative.
- **Gray 200** (`#e5e7eb`): Borders (via shadow), dividers.
- **Gray 100** (`#f3f4f6`): Subtle surfaces, hover backgrounds.
- **Gray 50** (`#f9fafb`): Page background alternative.

### Shadows & Depth
- **Border Shadow**: `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px` — replaces CSS borders.
- **Subtle Lift**: `rgba(0, 0, 0, 0.04) 0px 2px 4px` — minimal card elevation.
- **Card Stack**: `rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px, rgba(0,0,0,0.02) 0px 8px 16px -4px` — full card shadow.
- **Active Card**: `0px 0px 0px 2px #167c80` — teal ring for selected/active state.

## 3. Typography Rules

### Font Family
- **Primary**: `Inter`, with fallbacks: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace**: `"JetBrains Mono", "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Use |
|------|------|------|--------|-------------|----------------|-----|
| Display | Inter | 48px (3rem) | 700 | 1.0 | -0.06em | Landing hero title |
| Page Title | Inter | 32px (2rem) | 700 | 1.15 | -0.04em | Page headings |
| Section Title | Inter | 20px (1.25rem) | 600 | 1.3 | -0.02em | Card titles, section heads |
| Body Large | Inter | 16px (1rem) | 400 | 1.65 | normal | Descriptions, coach feedback |
| Body | Inter | 14px (0.875rem) | 400 | 1.5 | normal | Standard UI text |
| Body Medium | Inter | 14px (0.875rem) | 500 | 1.5 | normal | Nav links, emphasized text |
| Button | Inter | 14px (0.875rem) | 600 | 1.0 | normal | Buttons, CTAs |
| Caption | Inter | 12px (0.75rem) | 500 | 1.33 | normal | Metadata, small labels |
| Eyebrow | Mono | 11px (0.69rem) | 500 | 1.0 | 0.08em | Uppercase labels, status text |
| Code | Mono | 13px (0.81rem) | 400 | 1.5 | normal | Code, technical values |

### Principles
- **Compression at scale**: Display and title sizes use negative letter-spacing. Body sizes use normal tracking. The contrast creates visual hierarchy without extra weight.
- **Three weights, strict roles**: 400 (reading), 500 (interactive), 600-700 (headings/emphasis). No decorative bold.
- **Mono as system voice**: Monospace uppercase for eyebrows, status, and metadata conveys "coaching system" — structured, precise, trustworthy.

## 4. Component Stylings

### Buttons

**Primary (Teal)**
- Background: `#167c80`
- Text: `#ffffff`
- Padding: 10px 16px
- Radius: 8px
- Font: 14px weight 600
- Hover: `#0f5a5d`
- Focus: `2px solid hsla(176, 70%, 36%, 0.5)` outline

**Secondary (Ghost)**
- Background: `#ffffff`
- Text: `#0f1419`
- Padding: 10px 16px
- Radius: 8px
- Shadow: `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px`
- Hover: `#f3f4f6` background
- Focus: same teal outline

**Danger**
- Background: `#dc2626`
- Text: `#ffffff`
- Same padding/radius as primary

### Cards & Containers
- Background: `#ffffff`
- Border: via shadow — `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px`
- Radius: 12px
- Full shadow: `rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px`
- Active state: replace shadow with `0px 0px 0px 2px #167c80`
- Hover: shadow intensifies slightly

### Chat Bubbles
- **Coach**: `#f3f4f6` background, left-aligned, 14px body text
- **User**: `#e6f5f5` background (teal tint), right-aligned
- Radius: 14px
- Padding: 12px 16px
- Max-width: 85%

### Exercise Cards
- Background: `#ffffff`
- Shadow-border: `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px`
- Radius: 10px
- Padding: 14px 16px
- Active: `0px 0px 0px 2px #167c80`, background `#f0fafa`
- Exercise name: 14px weight 600
- Sets/reps: 14px weight 400, gray-600

### Status Badges (Pills)
- Radius: 9999px
- Padding: 2px 10px
- Font: 11px mono, uppercase, weight 500
- **Good**: background `#dcfce7`, text `#16a34a`
- **Warning**: background `#fef3c7`, text `#d97706`
- **Poor**: background `#fee2e2`, text `#dc2626`
- **Adjusted**: background `#e6f5f5`, text `#167c80`

### Inputs
- Border: via shadow — `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px`
- Radius: 10px
- Padding: 10px 14px
- Focus: `0px 0px 0px 2px hsla(176, 70%, 36%, 0.5)`
- Placeholder: gray-400

### Navigation
- White background, sticky
- Shadow-border bottom: `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px`
- Logo/title: 16px weight 700, `#0f1419`
- Nav links: 14px weight 500
- Active link: `#167c80` text or underline

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
- Component internal padding: 12-16px
- Card gaps: 16px
- Section gaps: 48-64px
- Page horizontal padding: 16px mobile, 24px desktop

### Grid & Container
- Max content width: 1120px, centered
- Hero: two-column asymmetric grid (1.1fr / 0.9fr)
- Dashboard: two-column equal grid
- Workout: two-column (exercise list / chat panel)
- All grids collapse to single column at 920px

### Whitespace Philosophy
- **Generous breathing room**: Large vertical gaps (48-80px) between sections. White space communicates confidence.
- **Dense content, open surroundings**: Cards and chat bubbles are compact; the space between them is generous.
- **No decorative backgrounds**: Separation comes from shadow-borders and spacing, not color blocks.

### Border Radius Scale
- Subtle (4px): Inline elements, code snippets
- Standard (8px): Buttons, small interactive elements
- Comfortable (10px): Inputs, exercise cards
- Card (12px): Main cards, containers
- Bubble (14px): Chat bubbles
- Large (16px): Feature cards, modal
- Pill (9999px): Badges, status pills
- Circle (50%): Avatars, toggle buttons

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (0) | No shadow | Page background, text blocks |
| Ring (1) | `rgba(0,0,0,0.08) 0px 0px 0px 1px` | Default card border, inputs |
| Card (2) | Ring + `rgba(0,0,0,0.04) 0px 2px 4px` | Cards, containers |
| Elevated (3) | Ring + `rgba(0,0,0,0.06) 0px 4px 12px` | Dropdowns, popovers |
| Active (focus) | `0px 0px 0px 2px #167c80` | Selected cards, focused inputs |
| Focus Ring | `2px solid hsla(176, 70%, 36%, 0.5)` outline | Keyboard focus on all interactive elements |

## 7. Scoring & Feedback Visualization

Form analysis scores use a three-tier system with strict color mapping:

| Score Range | Label | Color | Badge Background |
|-------------|-------|-------|-----------------|
| 80-100 | Good | `#16a34a` | `#dcfce7` |
| 60-79 | Needs Work | `#d97706` | `#fef3c7` |
| 0-59 | Poor | `#dc2626` | `#fee2e2` |

Score display: large mono text (32px weight 700) with the score number, colored by tier. Surround with a card using the badge background as a subtle tint.

Individual metrics (depth, knee tracking, tempo, etc.) display as a vertical stack with:
- Metric name: 12px mono uppercase eyebrow
- Status icon: colored by tier (checkmark / warning / x)
- Brief feedback: 14px body text

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Changes |
|------|-------|---------|
| Mobile | <640px | Single column, reduced padding, stacked actions |
| Tablet | 640-920px | Transitional, some 2-col grids |
| Desktop | >920px | Full layout, 2-column grids, side-by-side panels |

### Collapsing Strategy
- Hero grid: 2-col to 1-col at 920px
- Dashboard/workout grids: 2-col to 1-col at 920px
- Exercise cards: horizontal to vertical stack at 640px
- Chat panels: full-width on mobile
- Action bars: row to column at 640px
- Page padding: 24px to 16px on mobile
- Section gaps: 64px to 40px on mobile

## 9. Do's and Don'ts

### Do
- Use shadow-as-border (`0px 0px 0px 1px rgba(0,0,0,0.08)`) instead of CSS borders
- Use Coach Teal only for actions, active states, and links — it's functional, never decorative
- Use monospace uppercase for system labels (eyebrows, status, metadata)
- Keep the neutral scale achromatic — grays and white are the system
- Use semantic colors (green/amber/red) only for score feedback, never for decoration
- Compress letter-spacing at display sizes, relax at body sizes
- Give cards generous surrounding whitespace

### Don't
- Don't use gradients, glow effects, or background colors for section differentiation
- Don't use teal as a background color for large areas
- Don't use traditional CSS borders on cards — use shadow-border
- Don't mix score colors into non-score UI
- Don't use weight 800+ — 700 is the maximum, reserved for display headings
- Don't add decorative illustrations or fitness imagery into the UI chrome
- Don't use more than one accent color — teal is the only brand color
- Don't crowd cards — if content feels tight, add padding, don't shrink text

## 10. Agent Prompt Guide

### Quick Color Reference
- Background: `#ffffff`
- Page tint: `#fafbfc`
- Text primary: `#0f1419`
- Text secondary: `#4b5563`
- Text muted: `#6b7280`
- Accent: `#167c80`
- Accent hover: `#0f5a5d`
- Border shadow: `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px`

### Example Component Prompts
- "Hero section: white background. Headline 48px Inter weight 700, line-height 1.0, letter-spacing -0.06em, color #0f1419. Subtitle 16px weight 400, line-height 1.65, color #4b5563. Teal CTA (#167c80, 8px radius, 10px 16px padding) and ghost button (white, shadow-border, 8px radius)."
- "Card: white background, no CSS border. Shadow: rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px. Radius 12px. Title 20px Inter weight 600, letter-spacing -0.02em. Body 14px weight 400, #4b5563."
- "Status badge: 9999px radius, 2px 10px padding, 11px mono uppercase weight 500. Good: bg #dcfce7 text #16a34a. Warning: bg #fef3c7 text #d97706."
- "Chat bubble (coach): bg #f3f4f6, radius 14px, 12px 16px padding, left-aligned. Role label: 11px mono uppercase #6b7280 above. Body: 14px weight 400 #0f1419."
