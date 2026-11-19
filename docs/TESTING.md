# Editor testing

The production editor is still `index.html`; it needs no build command or npm installation. All test dependencies live inside `tests/`, so they do not change root-level static-site framework detection.

## Run the complete suite

Use Node.js 24 or later:

```bash
npm --prefix tests ci
npm --prefix tests test
```

Run only workflow integration tests:

```bash
npm --prefix tests run test:integration
```

The geometry suites can also run without installed dependencies:

```bash
node --test tests/pen-controls.test.cjs tests/canvas-view.test.cjs
```

## Verification layers

| Suite | Verified behavior |
| --- | --- |
| `pen-controls.test.cjs` | Handle modes, Alt separation, Shift constraints, copies/transforms, open-path snapshots, curve-preserving insertion |
| `canvas-view.test.cjs` | Fit/zoom, coordinate round trips after scroll, resize, memory limits, point and curve selection, pan routing, keyboard behavior |
| `editor.integration.test.cjs` | Entire unmodified editor script, DOM events, actual Canvas pixels, reference decoding, preview font construction, and downloaded OTF contents |

The integration harness uses jsdom for DOM/event behavior and `@napi-rs/canvas` for real Canvas rendering and image decoding. It uses opentype.js **0.6.5**, matching the production CDN version. Generated fonts are parsed by opentype.js and accepted by the native font parser. Downloads are captured as actual Blob data, not written through browser download UI.

The integration workflows cover:

1. Vertical tool placement, contextual panels, initial disabled states, and tool switching.
2. Pen drawing → live preview → named `.otf` download, with 64 font glyph entries (62 characters, space, and `.notdef`).
3. Freehand weights, character navigation, advance width, undo/redo, and clear/restore.
4. Zoom, Pan, Grid/Guides, and layer visibility without changes to exported outlines.
5. Image upload, opacity, fit, per-character visibility, removal, reference movement, and lock state.
6. Numeric anchor edits, handle modes, undo, shape move/resize, and hidden/locked-layer protection.
7. Editing an unfinished path, resuming, closing, undoing closure, cancelling, and the empty-font download guard.
8. Invalid image MIME types and corrupted image data while preserving the previous reference.
9. Nested contours rasterized from the exported glyph to verify that a counter remains transparent.
10. Grid On/Off produces a visible pixel change independently of Guides, while guide lines remain available when grid is disabled.

## Current result and limits

The suite contains **30 geometry/view tests and 12 workflow integration tests**. All passed during the vertical-toolbar update.

The harness adapts layout dimensions, pointer capture, clocks, and FontFace. It does not render CSS layout or execute a real browser. Consequently, these tests do **not** certify responsive visual layout, browser-native FontFace loading, native download dialogs, file-picker UI, Safari/Chrome differences, or touch/stylus compatibility.

Browser automation was unavailable during this update. Those checks remain a separate manual verification step; the [canvas review checklist](CANVAS_REVIEW.md#manual-browser-checklist) lists the cases. A native-rendered canvas image was also inspected, but it is not a screenshot of the full browser layout.
