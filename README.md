# Aksara — Browser-Based Font Maker

**Draw your own typeface. Export a real, installable `.otf` font.**

Aksara is a professional-grade, browser-native vector font creation tool. Draw glyphs freehand or trace scanned handwriting with a full Bézier pen tool, then download a working OpenType font — no software installation required.

---

## Features

**Drawing Tools**
- **Move tool (V)** — select, move, and resize completed shapes
- **Direct Selection (A)** — per-anchor editing with Bézier handles; Alt-drag to break mirror
- **Pen tool (P)** — click or click-drag for smooth anchors; click last anchor to break curve direction; drag-close to control the closing curve before committing
- **Freehand (B)** — natural brush strokes rasterized to clean vector outlines via marching squares contour tracing
- Add anchor to existing closed shape by clicking on its edge (Pen+ behavior)

**Reference Image System**
- Upload a scan or photo as a tracing reference
- Two-layer panel: Drawing layer and Reference layer, each with independent visibility and lock controls
- Move, resize (free or Shift-proportional), and opacity control

**Undo / Redo**
- Full history stack per glyph (up to 64 steps)
- Undo after closing a Bézier path reopens it for continued editing
- Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z

**Font Export**
- Real `.otf` output via OpenType CFF tables (opentype.js)
- Live preview using the FontFace API — rebuilds as you draw
- 62 characters: 0–9, A–Z, a–z
- Per-glyph advance width control

**Interface**
- Swiss editorial aesthetic — clean, tool-focused, zero decoration
- Layers panel with Drawing / Reference layer controls
- Keyboard shortcuts: V / A / P / B for tools, Arrow keys for nudge

---

## Quick Start

The tool is a single, self-contained HTML file with no build step and no server required.

```bash
git clone https://github.com/your-org/aksara.git
open aksara-font-maker.html
```

Or just open `aksara-font-maker.html` directly in any modern browser (Chrome, Firefox, Safari, Edge).

---

## Pen Tool Workflow

```
1. Press P to activate the Pen tool
2. Click        → corner anchor
   Click-drag   → smooth anchor with Bézier handles
3. Click last anchor (within 6px) → convert to corner (change direction freely)
4. Hover over first anchor (violet ring appears) → drag to set closing curve → release to fill
5. Press A to adjust anchors without losing the in-progress path
6. Press P to resume drawing from the last anchor
7. Escape → deselect; Escape again → cancel path entirely
```

**Detailed anchor controls:**
Press **A**, select a pen shape, then click an anchor. Its handles are labeled **IN** (incoming, violet) and **OUT** (outgoing, blue); these follow the path direction rather than fixed screen left/right.

- **Corner:** remove both handles for a sharp corner.
- **Smooth:** keep handles aligned while allowing different lengths.
- **Symmetric:** keep both handles aligned and equally long.
- **Independent:** adjust each direction and length separately; Alt/Option-dragging a handle switches to this mode permanently.
- **Alt/Option-drag an anchor:** create a pair of handles without moving the anchor.
- **Shift-drag a handle:** constrain its angle to 45° increments.
- Use the anchor panel for exact X/Y positions and IN/OUT offsets in font units. Arrow keys move the selected anchor; without a selected anchor, they move the selected shape. Edits support undo/redo, including unfinished paths.

Run the pen geometry checks with `node --test tests/pen-controls.test.cjs`.

**Add anchor to existing shape:**
With the Pen tool active and no path in progress, click directly on the edge of any filled shape. A new anchor is inserted at that exact point using de Casteljau subdivision — the curve does not change shape.

---

## Tech Stack (Tool)

| Concern | Approach |
|---|---|
| Rendering | HTML5 Canvas (two layers: reference + ink) |
| Bézier math | Custom implementation (flattenCubic, de Casteljau) |
| Contour tracing | Marching squares algorithm |
| Winding correction | Nesting-depth + scanline point-in-polygon |
| Font export | opentype.js v0.6.5 (CFF/OTF) |
| Live preview | FontFace API with versioned family names |
| History | Per-glyph snapshot stack with in-progress path serialization |

---

## Commerce Architecture

Aksara is designed to be monetized as a SaaS product with a **credit-based economy**.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system overview, and the [`docs/`](./docs/) folder for detailed specifications:

| Document | Contents |
|---|---|
| [`docs/CREDIT_SYSTEM.md`](./docs/CREDIT_SYSTEM.md) | Credit economy, pricing tiers, referral mechanics |
| [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) | Full PostgreSQL schema (Supabase) |
| [`docs/PAYMENT_FLOW.md`](./docs/PAYMENT_FLOW.md) | Midtrans/Xendit integration, webhook handling |
| [`docs/ADMIN_PANEL.md`](./docs/ADMIN_PANEL.md) | Admin dashboard and CMS specifications |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Phased build plan (Phase 1 → 3) |

---

## Repository Structure

```
aksara/
├── aksara-font-maker.html   # Standalone tool (open directly in browser)
├── README.md
├── ARCHITECTURE.md
├── LICENSE
└── docs/
    ├── CREDIT_SYSTEM.md
    ├── DATABASE_SCHEMA.md
    ├── PAYMENT_FLOW.md
    ├── ADMIN_PANEL.md
    └── ROADMAP.md
```

---

## Credits

Built by **PT Digital Pustaka Senarasi**

Font rendering powered by [opentype.js](https://github.com/opentypejs/opentype.js) (MIT License).

---

## License

MIT — see [`LICENSE`](./LICENSE)
