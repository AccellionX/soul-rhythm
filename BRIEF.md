# Soul Rhythm — clickable sales prototype

Warm personal-brand site for a consultant named Lori. Static HTML/CSS/vanilla JS only. Single-page app. Exact copy below must be used as written.

## Tech & style

- Fonts from Google Fonts: Fraunces (headings), Inter (body), Caveat (whiteboard).
- Palette: warm cream, sage green, terracotta, soft gold.
- Text over images sits on a soft translucent warm panel so it is always readable.
- Full-screen scenes use `object-fit: cover`.
- Small fixed badge, bottom-left: `Prototype · placeholder visuals`
- Persistent `Soul Rhythm ⌂` home button, top-left, on every screen except the homepage. It goes to the Porch.
- Gentle fade transitions between screens (400–600ms), disabled under `prefers-reduced-motion`.
- Responsive, tap targets min 44px, no hover-only interactions, keyboard accessible, alt text, good contrast.

## Images

Place these files in `/images` when they are ready. Until they exist, each screen shows a warm sage/gold/terracotta gradient placeholder with the scene name in soft text. Dropping the real files in must work with no code changes.

- `images/neighborhood.jpg`
- `images/porch.jpg`
- `images/pond.jpg`
- `images/study.jpg`
- `images/garage.jpg`

## Screen 1 — Neighborhood (home)

Full-screen neighborhood image. Text fades in gently in sequence, all visible within about 2 seconds, no countdown:

Welcome to Soul Rhythm.

A place to explore possibilities, perspectives, and ideas.

Take a look around. There is lots to discover. There's no rush.

Button: Explore Soul Rhythm → Porch

Or, if you came looking for something specific, you can head there directly.

Three image cards (pond, study, garage thumbnails) labeled:

- Journey
- Stories
- Consulting

Each card goes to that space directly.

## Screen 2 — Porch

Full porch image with 4 hotspots positioned by percentage, defined in one config object at the top of `app.js`:

- Bird feeder → Journey
- Book → Stories
- Metal art → Consulting
- Heart sign → Meet Lori

Each hotspot is a soft glowing circle with a small label. Labels are always visible on mobile, and on hover/focus on desktop. The heart has a very subtle slow pulse.

Below the scene, a simple labeled nav bar with the same 4 options as a fallback.

Soul Rhythm text overlaid near the sign in the serif font.

## Screen 3 — Meet Lori

Modal over the porch: 16:9 video placeholder box with a play icon and the title Lori's welcome video.

Caption: A quick hello from Lori.

Button: Back to the porch

Opening it sets `localStorage` key `sr_state` to `introduced` (unless the value is already `explored`).

## Screen 4 — Journey

Pond image full-screen. Ambient sound toggle, off by default (speaker icon, path `/audio/pond.mp3`, fail silently if missing). No music.

After a 2s pause, text appears one step at a time. The visitor advances with a gentle Continue link.

1. What sort of experiences or activities fill you up?
   Optional small textarea (not saved).
2. Okay, let's start there.
3. What is it about that activity or experience that gives you energy?
   Optional textarea.
4. Sometimes all it takes is a moment to notice. And sometimes, that moment makes us curious about what might be possible. If you'd like to keep exploring, I'm here.
   Button: Continue the conversation → https://calendly.com in a new tab
   Small italic: It can take as little or as much time as you have.
   Link: Back to the porch

## Screen 5 — Stories

Study image full-screen. Text panel:

Soul Rhythm Stories is a place to settle in and explore.

Here you'll find stories and ideas that may make you wonder, think differently, discover something you didn't know, or simply leave you wanting to know more.

Button: Explore Stories → Collection

## Screen 6 — Stories collection

Warm cream page. Search bar. Filter chips: All, Books, Movies, Streaming, New, Recommended.

Grid of 8 sample items (cover placeholder, title, one line, price or Recommendation tag, View button). Search and filters work on the sample data.

Footer links:

- Continue exploring Stories
- Return to Soul Rhythm

Small note: Store and checkout powered by WooCommerce or Shopify in the real build.

### Sample catalog

1. The Gift of Rest — Book — A quiet invitation to reclaim unhurried time. — $18
2. Porch Light — Book — Essays on noticing what's already here. — $22
3. Still Waters — Movie — A film about returning home and beginning again. — $4.99
4. Morning Pages — Streaming, Recommended — A short series on daily creative practice. — Recommendation
5. Letters from the Garden — Book, New — Correspondence on growing and letting go. — $16
6. The Long Walk Home — Movie, Recommended — Two friends, one road, many questions. — Recommendation
7. Kitchen Table Talks — Streaming — Conversations that wander toward what matters. — $3.99
8. Finding Your Rhythm — Book, New — A field guide for living at a human pace. — $24

## Screen 7 — Consulting

Garage image full-screen. Hand-drawn-looking whiteboard panel (Caveat font, slightly uneven, marker colors):

What are you thinking about? ↓ Why does it matter? ↓ What's possible?

Then step by step:

1. What's got you thinking?
   Textarea (not saved).
2. Interesting. What makes this matter to you?
   Textarea.
3. Want to talk it through?
   Button: Continue the conversation → Calendly placeholder
4. Thanks for sharing that. Ideas don't have to be finished before we talk about them.
   Link: Back to the porch

## Returning visitors

`localStorage` key: `sr_state`, wrapped in try/catch.

Entering Journey, Stories, or Consulting sets `sr_state` to `explored`.

- none → start at Neighborhood
- `introduced` → start at Porch with a small fading Welcome back.
- `explored` → Porch + Welcome back. + three quick-access cards: Journey | Stories | Consulting

Tiny Reset prototype link in the footer clears the state and reloads.
