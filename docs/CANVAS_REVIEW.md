# Canvas usability review

## Findings and changes

| Finding from implementation review | Change |
| --- | --- |
| The artboard shell had a fixed 546 px width limit while the editor could offer more room. | Fit the board to the available viewport, keep its square 1000 em coordinate frame, and let the inspector move below it on narrower screens. |
| Dot patterns competed inside and outside the artboard. | Use a plain neutral studio surround, lighter grid dots, and lower-contrast height guides. Keep the advance-width boundary distinct. |
| Detailed curves could only be edited at the fitted scale. | Add 100–400% zoom, a Fit reset, and pan/scroll navigation without changing font geometry. |
| Anchor/handle hit tests returned the first candidate within range. | Choose the nearest candidate; compare anchor and handle distances so a nearby handle cannot steal a closer anchor click. |
| Every selected shape's handles were shown together. | Show handles for the active anchor while retaining all anchor markers. Only visible active handles are hit-testable. |
| Selection of a thin or hollow contour could be difficult; sparse curve samples could miss clicks between them at high zoom. | Allow edge selection in Anchors mode and measure distance to adaptive screen-space curve intervals instead of isolated sample points. |
| High zoom and high device pixel ratio could allocate very large canvas buffers. | Bound each display buffer to 2560 px per side; keep export resolution independent. |

## Coordinate and input contract

Zoom is a presentation scale. Font positions, handle offsets, stroke weights in font units, history snapshots, and the export pipeline retain their original values. Pointer conversion uses the current rendered canvas rectangle and `emScale`. Rulers remain outside this coordinate space.

The viewport captures Pan input before it reaches drawing handlers. A normal primary-button click still reaches the active drawing tool. Text/select fields retain native editing keys; Space on native buttons still activates them. Switching drawing tools exits persistent Pan.

## Verification

Run:

```bash
node --test tests/pen-controls.test.cjs tests/canvas-view.test.cjs
```

The suite covers anchor continuity and insertion plus coordinate round trips at each zoom, view-center preservation, Fit, responsive recalculation, zoom limits and interaction guards, display-buffer bounds, nearest-point selection, active-handle visibility, pan event routing, and native keyboard behavior.

Browser automation was unavailable during this review. These automated checks exercise the implementation with simulated canvas/viewport geometry and input events; they do not establish visual quality or device compatibility.

## Vertical toolbar and workflow follow-up

The two horizontal tool rows have been replaced with a vertical rail sharing the canvas row. Character navigation is now in the artboard bar without a separate editor heading; width, freehand weight, pen actions, and reference controls are in the inspector. This removes tool rows above the artboard.

Full-editor integration tests now execute the unmodified editor script using a DOM, actual native Canvas rendering, and OpenType generation/parsing. They found and now prevent drawing into a hidden layer, validate corrupt reference handling, and check hole preservation in exported contours. These extend the geometry tests without replacing browser layout or touch/stylus verification. See [TESTING.md](TESTING.md).

## Focus-mode follow-up

The full project header can be hidden manually. A small A-logo restore button and export icon remain in the rail, progress stays with Character set, and the 1000 units/em readout stays in the footer. A locally stored preference restores the chosen view on startup; storage failures fall back safely. Active pointer gestures block layout changes, and both export controls use the same handler/busy state. Integration tests verify view restoration, geometry/name preservation, unfinished paths, and focused export.

## Manual browser checklist

- Draw and edit a glyph at Fit, 200%, and 400%; compare coordinates and exported output.
- Pan over ink using the button, Space-drag, and middle mouse; confirm that no marks or anchor changes occur.
- Return to Fit, resize the window, and confirm that the complete artboard and external rulers are accessible.
- Check nearby anchors and short handles at each zoom, including unfinished paths.
- Check 360 px mobile, tablet, and desktop layouts; ensure the inspector does not shrink the mobile drawing surface and the zoom controls remain reachable.
- Upload a reference image, adjust it at different zoom levels, then verify layer locks/visibility and live font preview.
- Check touch/stylus panning and drawing, keyboard focus, and exported-font installation in actual browsers.
