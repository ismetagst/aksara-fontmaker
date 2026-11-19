# Aksara Editor Guide

This guide describes the standalone editor in [`index.html`](../index.html). For planned accounts, project saving, and payments, see the [roadmap](ROADMAP.md).

## Start a font

1. Open `index.html` or serve the repository using the [Quick Start](../README.md#quick-start).
2. Select a character in **Character set**. The editor supports 62 glyphs: numbers, capitals, and lowercase Latin letters.
3. Choose **Pen (P)** or **Draw / Freehand (B)** from the vertical rail on the left. Freehand weight appears in the **Glyph settings** inspector.
4. Adjust completed pen shapes with **Move (V)** or **Anchors (A)**.
5. Type sample text in **Type tester**, then set its display size between 24 and 120 px.
6. Set the font name and select **Download Font (.otf)**.

At least one glyph must contain a mark before export. Characters that have not been drawn export as blank spaces. Work exists only in browser memory: reloading or closing the page loses the project.

## Focus mode

Use the chevron button at the very top of the left tool rail to enter Focus mode. It hides the entire project header, including the large wordmark, introduction, font-name field, and full download button. There is no replacement header row above the editor.

- The small **A logo** remains at the top of the rail. Click it to restore the full header and edit the font name.
- The download icon remains available in the rail while focused. It exports the same project and font name as the full header button.
- Drawing progress lives in **Character set** in both modes. Character navigation stays in the artboard bar; the 1000 units/em readout appears only in the canvas footer.
- Export/error messages remain visible outside the hidden header.
- Toggling modes preserves glyphs, reference settings, unfinished paths, and zoom. It does not interrupt an active pointer gesture; finish the stroke/drag before changing modes.
- The preference is remembered in local browser storage when available. If storage is unavailable, the toggle still works for the current page.

This saved preference concerns the interface only. It does not add project autosave: drawings still exist in browser memory until you leave or reload the page.

## Canvas and guides

The white artboard sits beside a vertical tool rail with character navigation (**‹ 0 ›**) in its own top bar. The separate Glyph editor title row has been removed. Move, Anchors, Draw, Pen, Pan, history, clear, and reference upload live in the compact icon-only rail. Hover or focus a tool to see its name and shortcut; Escape dismisses the tooltip. Accessible button names remain available to screen readers. Width, tool-specific options, reference controls, layers, and anchor properties live in the inspector. The white artboard uses the available canvas viewport inside a quiet neutral studio surface. The inspector moves below the canvas on narrower screens. Rulers sit outside the drawing surface and display font units, so they do not offset anchor coordinates.

| Measurement | Value |
| --- | --- |
| Units per em | 1000 |
| Ascender / artboard top | 800 |
| Cap height | 700 |
| x-height | 500 |
| Baseline | 0 |
| Descender / artboard bottom | −200 |
| Horizontal artboard span | 0–1000 |

The cap-height and x-height values are Aksara’s current presets, not universal proportions required for every typeface. These guides help keep glyph heights consistent; they do not crop outlines.

Font Y coordinates increase upward. The artboard's top-left is `(0, 800)`, and its bottom-left is `(0, −200)`.

- **Grid** shows or hides a line grid: 50-unit subdivisions with stronger lines every 100 units. The button displays On/Off so its state is explicit.
- **Guides** shows or hides the cap-height, x-height, baseline, and advance-width boundary, together with the area beyond that boundary.
- The vertical **ADV** line is the advance width: where the next character begins, not a clipping edge. Ink may extend beyond it. The advance-width readout follows the active glyph. **Width** accepts 150–900 units and rounds to steps of 10.
- The line grid is visual guidance; it does not snap anchors to grid intersections.
- These display controls affect neither drawing coordinates nor exported outlines. The rulers remain visible when the grid or guides are hidden.

### Zoom and pan

- Use **+** / **−** beside the zoom percentage, or the keyboard's plus/minus keys, to move through 100%, 125%, 150%, 200%, 300%, and 400%.
- **100%** means the full artboard fitted to the available viewport, not one font unit per screen pixel. Use **Fit** or **0** to restore this view and reset scrolling.
- Zoom preserves the glyph position at the viewport center where the scroll bounds allow. It changes the rendered scale, not glyph coordinates, stroke widths in font units, history, or export geometry.
- To navigate a magnified artboard, enable **Pan**, hold **Space + drag**, use the middle mouse button, or use the scrollbars. Panning does not add marks or move anchors.
- Selecting a drawing tool exits the persistent Pan mode. Escape exits Pan before deselecting a shape.
- Zoom changes wait until an active stroke, anchor placement, transform, or pan has ended. Font-unit rulers remain attached to the artboard when zooming.

The rendering buffers are capped at 2560 px per canvas side to limit memory use on high-DPI displays at maximum zoom. This display limit does not change font export resolution.

## Draw and edit a Bézier path

Press **P**. Click to add a corner, or click-drag to create a curved anchor with two mirrored handles. Add at least three anchors before closing the shape.

Hover over the first anchor to see the violet closing indicator. Click to close, or drag from the first anchor to set its closing curve before releasing. Clicking the last anchor removes its outgoing handle so the next segment can change direction.

Press **A** to edit an unfinished path; press **P** to resume it. For completed shapes, press **A**, click the shape, and then click an anchor. The active anchor is filled, and the inspector shows its coordinates and handles. Only that anchor’s handles appear during anchor editing; the other anchors remain visible. When points are close together, the nearest point within the screen-pixel hit radius is selected. Completed contours can also be selected along their edge with Anchors mode.

The handles follow **path direction**, not fixed screen left/right:

- **IN**, violet: controls the curve arriving at the anchor.
- **OUT**, blue: controls the curve leaving the anchor.

Drag either endpoint to change the curve. Moving the anchor carries both handles along with it.

### Anchor modes

| Mode | Behavior | Typical use |
| --- | --- | --- |
| Corner | Removes both handles | Sharp joins and straight edges |
| Smooth | Keeps opposite directions aligned while preserving separate handle lengths | A continuous curve with different curvature on either side |
| Symmetric | Keeps opposite directions aligned and equal in length | Balanced curves |
| Independent | Allows each handle's direction and length to change separately | Curved corners and asymmetric joins |

Converting an anchor to **Corner** removes its handles. Converting it back creates handles from the surrounding geometry; use Undo to restore the exact previous curve.

- **Alt/Option-drag a handle:** switch that anchor to Independent. This separation persists after releasing Alt/Option.
- **Alt/Option-drag an anchor:** create a symmetric pair of handles without moving the anchor.
- **Shift-drag a handle:** constrain its angle to 45° increments.
- **Double-click an anchor:** toggle between Corner and Smooth.

### Numeric adjustments

Use the inspector's **X** and **Y** fields to place the anchor precisely. Incoming/outgoing **ΔX** and **ΔY** fields are offsets relative to the anchor, in font units. For an anchor at `(200, 400)` with outgoing offset `(100, 50)`, the outgoing endpoint is at `(300, 450)`.

Numeric handle edits follow the chosen mode. In Symmetric mode they also change the opposite handle; in Smooth mode they preserve the opposite length; in Independent mode they affect only the edited side.

With an anchor selected, arrow keys move that anchor by 4 units, or 16 units with Shift. With a shape selected but no active anchor, arrow keys move the shape instead.

### Insert an anchor

With **P** active and no unfinished path, click the edge of an existing closed pen shape. A new anchor is inserted using de Casteljau subdivision without changing the existing curve. The editor switches to Anchors mode for further adjustment.

## Reference images and layers

Use **Image** in the left tool rail to load a scan or photo. The Reference inspector shows image status, visibility/lock/fit/remove actions, and the opacity value. Invalid or unreadable files report an error while keeping any previously loaded reference. The image is shared across glyphs; each glyph has its own reference placement and settings.

- Use **Move (V)** to select, move, and resize an unlocked reference image.
- Hold Shift while resizing to preserve proportions.
- **Fit to guides** fits the reference frame to the glyph's advance width and cap height; the image fills that frame and may be cropped.
- Adjust opacity, visibility, or lock state using the reference controls or Layers panel.
- **Remove image** removes the shared image from all glyphs.

Drawing and Reference have separate visibility and lock controls. The Drawing layer's visibility/lock state applies across glyphs. Hiding a layer is an editing display setting and does not delete its marks. A hidden or locked Drawing layer cannot receive new drawing input. Hiding a selected shape or reference clears its transform selection. The reference image is used for tracing and is not included in font export.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Move / transform | V |
| Anchor selection and editing | A |
| Pen | P |
| Freehand | B |
| Canvas zoom | + / − |
| Fit artboard | 0 |
| Pan canvas | Space+drag, middle mouse, or Pan button |
| Undo | Cmd/Ctrl+Z |
| Redo | Cmd/Ctrl+Shift+Z; Ctrl+Y on Windows/Linux |
| Nudge selected anchor or shape | Arrow keys |
| Larger nudge | Shift+Arrow keys |
| Previous / next glyph, with no selection or unfinished path | Left / Right arrow |
| Proportional resize | Shift+drag resize handle |
| Constrain Bézier handle angle | Shift+drag handle |
| Separate a handle | Alt/Option+drag handle |
| Create handles on an anchor | Alt/Option+drag anchor |
| Deselect, then cancel an unfinished path | Escape |

Text and number fields retain their native editing shortcuts. Tools can also be reached with Tab and activated using Enter or Space.

## History, preview, and export

Undo/redo is tracked per glyph for drawing and anchor edits, including unfinished paths. Undo immediately after closing a path reopens it for further editing. This history is temporary browser state, not a saved project or a versioning system for every editor setting.

The type tester rebuilds the live font as you draw. Overlapping shapes and holes are composited for the font; the ink canvas may show overlaps differently. Preview text size changes the display only.

Export generates an installable `.otf` font through opentype.js. That library loads from cdnjs and must be available for font building and live preview. Drawing a glyph does not fill in the other characters automatically.

## Validation and limits

Run `npm --prefix tests ci`, then `npm --prefix tests test` from the repository root (Node.js 24+). See the [testing guide](TESTING.md) for dependency-free geometry checks and integration coverage. The tests check handle continuity, independent edits, angle constraints, copies, open-path snapshots, and curve-preserving insertion.

Manual browser checks should also cover drawing and dragging at multiple zoom levels, pan without marks, Fit, responsive layout, Grid/Guides toggles, reference upload, live preview, and installation of an exported font. See the [canvas review](CANVAS_REVIEW.md) for decisions and verification limits. Passing geometry tests alone does not verify those browser flows.

Current limits include the 62-character set, browser-memory storage, and the external font-building dependency. There are no account, autosave, payment, or credit gates in the standalone editor.
