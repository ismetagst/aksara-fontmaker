# Changelog

Changes listed here describe the standalone editor. Planned commerce functionality is tracked in [docs/ROADMAP.md](docs/ROADMAP.md).

## Unreleased

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
