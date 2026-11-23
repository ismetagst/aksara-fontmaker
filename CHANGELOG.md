# Changelog

Changes listed here describe the standalone editor. Planned commerce functionality is tracked in [docs/ROADMAP.md](docs/ROADMAP.md).

## Unreleased

### Adaptive workspace

- Use available window height for the viewport while preserving the square font artboard and font-space coordinates.
- Add independent Character set collapse, protected during active canvas gestures; keep artboard navigation accessible.
- Show Anchor properties only for a selected anchor and Reference settings when an image is loaded; preserve shared-image/per-glyph settings behavior.
- Compact tool-specific hints and enlarge character navigation targets, including coarse-pointer sizing.
- Add regression coverage for layout controls, unfinished paths, history/export preservation, reference settings, and scroll-stable height calculations.

### Focus mode

- Added manual header collapse with a compact A-logo restore button and export icon in the tool rail; remembered the view preference when local storage is available.
- Moved character navigation into the artboard bar and progress into Character set; removed the separate Glyph editor heading and repeated units/em badge.
- Kept export/error feedback outside the hidden header and shared the download handler and busy state across both export controls.
- Guarded header reflow during active pointer gestures and covered header restoration, storage fallback, geometry/name preservation, unfinished paths, and focused export in integration tests.


### Visible grid toggle

- Replaced nearly invisible low-opacity 1 px dots with 50-unit grid lines and stronger 100-unit lines.
- Added explicit Grid On/Off feedback and a regression check for the pixel difference independently of Guides.


### Compact tools and guide clarity

- Reduced the desktop tool rail from 64 to 48 px and tool icons from 18 to 16 px; removed visible tool text in favor of hover/focus tooltips and accessible names.
- Added Escape dismissal for tooltips while preserving keyboard tool activation.
- Clarified the visual-only grid and guide functions in tooltips, renamed the width control to Advance width, and labeled its canvas boundary ADV.


### Vertical tools and workflow validation

- Replaced horizontal toolbar rows with a labeled vertical tool rail beside the artboard; moved glyph navigation into the compact editor heading.
- Moved glyph width, freehand weight, pen actions, and reference controls into contextual inspector panels; added reference status and numeric opacity feedback.
- Blocked new drawing in hidden Drawing layers and cleared selections when hiding shapes or references.
- Added reference-file validation and decode/read error handling without removing the previous reference image.
- Added full-editor workflow tests using a DOM, real native Canvas rendering, actual OTF downloads, font parsing, and rendered counter checks.
- Isolated development dependencies under `tests/`; the production editor remains a buildless static page.


### Canvas usability

- Expanded the artboard to fit its viewport and reduced competing background patterns and guide contrast.
- Added 100–400% zoom, Fit, keyboard shortcuts, and pan using a hand toggle, Space-drag, or middle mouse.
- Kept glyph geometry, font coordinates, and export resolution independent of zoom and scroll; capped display buffers for memory use.
- Selected the nearest editable point and showed handles only for the active anchor during anchor editing.
- Made curve-edge hit testing adapt to screen-space curve length and include intervals between samples for reliable high-zoom selection.
- Added contour-edge selection in Anchors mode, preserved native field/button shortcuts, and prevented right/middle clicks from adding marks.
- Added tests for canvas coordinates, zoom anchoring, pan input routing, fit/resize, rendering bounds, and dense-point selection.


### Favicon and search metadata

- Added a violet A-monogram favicon in SVG, PNG, and ICO formats, plus Apple and application icons.
- Added descriptive page metadata, a canonical Netlify URL, Open Graph/Twitter summaries, and website/application structured data.
- Added a web manifest, robots.txt, sitemap.xml, and a deployment/indexing guide.


### Interface and canvas

- Redesigned the editor with responsive studio panels, labeled tools, progress feedback, and a blue–violet palette with neutral surfaces.
- Replaced the canvas presentation with a white artboard, external coordinate rulers, cap-height/x-height/baseline labels, and an advance-width readout.
- Added independent Grid and Guides display toggles without changing drawing coordinates or export geometry.
- Added a live type-tester size control from 24 to 120 px.
- Updated the footer to “Crafted by Resenarasi,” linked to Instagram with bold hover styling.

### Pen and anchors

- Added Corner, Smooth, Symmetric, and Independent anchor modes.
- Added selected-anchor highlighting, IN/OUT handle labels, and numeric position/handle-offset controls.
- Preserved unequal handle lengths in Smooth mode and independent handle movement after releasing Alt/Option.
- Added Alt/Option-drag anchor conversion and Shift constraints in 45° increments.
- Preserved anchor modes during copies/transforms and before/after snapshots when editing unfinished paths.
- Made arrow-key nudges undoable and directed them to the active anchor when one is selected.

### Accessibility and shortcuts

- Replaced toolbar action spans with native buttons and synchronized disabled/pressed states.
- Kept native undo and selection behavior in text fields and prevented modifier shortcuts from changing drawing tools.
- Fixed uppercase Shift+Z handling for redo and cleared modifier state when the window loses focus.

### Documentation and validation

- Corrected Quick Start commands and repository structure to use `index.html` and the actual repository URL.
- Added a complete editor guide covering artboard coordinates, anchor modes, shortcuts, reference layers, preview, and export limits.
- Updated architecture and roadmap documentation to distinguish the current editor from planned commerce features.
- Added Node.js tests for anchor geometry, editing behavior, and open-path history snapshots.
