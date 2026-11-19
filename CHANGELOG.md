# Changelog

Changes listed here describe the standalone editor. Planned commerce functionality is tracked in [docs/ROADMAP.md](docs/ROADMAP.md).

## Unreleased

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
