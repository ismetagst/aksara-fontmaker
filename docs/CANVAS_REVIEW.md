# Canvas usability review

## Findings and changes

| Finding from implementation review | Change |
| --- | --- |
| The artboard shell had a fixed 546 px width limit while the editor could offer more room. | Fit the board to the available viewport, keep its square 1000 em coordinate frame, and let the inspector move below it on narrower screens. |
| Dot patterns competed inside and outside the artboard. | Use a plain neutral studio surround, lighter grid dots, and lower-contrast height guides. Keep the advance-width boundary distinct. |
| Detailed curves could only be edited at the fitted scale. | Add 100–400% zoom, a Fit reset, and pan/scroll navigation without changing font geometry. |
| Anchor/handle hit tests returned the first candidate within range. | Choose the nearest candidate; compare anchor and handle distances so a nearby handle cannot steal a closer anchor click. |
| Every selected shape's handles were shown together. | Show handles for the active anchor while retaining all anchor markers. Only visible active handles are hit-testable. |
| Selection of a thin or hollow contour could be difficult. | Allow edge selection in Anchors mode, including points just outside the fill. |
| High zoom and high device pixel ratio could allocate very large canvas buffers. | Bound each display buffer to 2560 px per side; keep export resolution independent. |

## Coordinate and input contract

Zoom is a presentation scale. Font positions, handle offsets, stroke weights in font units, history snapshots, and the export pipeline retain their original values. Pointer conversion uses the current rendered canvas rectangle and `emScale`. Rulers remain outside this coordinate space.

The viewport captures Pan input before it reaches drawing handlers. A normal primary-button click still reaches the active drawing tool. Text/select fields retain native editing keys; Space on native buttons still activates them. Switching drawing tools exits persistent Pan.

## Verification

Run:

```bash
node --test tests/*.test.cjs
```

The suite covers anchor continuity and insertion plus coordinate round trips at each zoom, view-center preservation, Fit, responsive recalculation, zoom limits and interaction guards, display-buffer bounds, nearest-point selection, active-handle visibility, pan event routing, and native keyboard behavior.

Browser automation was unavailable during this review. These automated checks exercise the implementation with simulated canvas/viewport geometry and input events; they do not establish visual quality or device compatibility.

## Manual browser checklist

- Draw and edit a glyph at Fit, 200%, and 400%; compare coordinates and exported output.
- Pan over ink using the button, Space-drag, and middle mouse; confirm that no marks or anchor changes occur.
- Return to Fit, resize the window, and confirm that the complete artboard and external rulers are accessible.
- Check nearby anchors and short handles at each zoom, including unfinished paths.
- Check 360 px mobile, tablet, and desktop layouts; ensure the inspector does not shrink the mobile drawing surface and the zoom controls remain reachable.
- Upload a reference image, adjust it at different zoom levels, then verify layer locks/visibility and live font preview.
- Check touch/stylus panning and drawing, keyboard focus, and exported-font installation in actual browsers.
