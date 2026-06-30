# Gooda Editor Page Structure

This page is the MVP mobile layer editor for 痛包 / 谷子 layout work. The current structure is intentionally split by maintenance boundary, not by visual size.

## File Map

- `index.vue`
  - Page orchestrator.
  - Owns editor state, selection, history, layer gestures, drawer gestures, storage, and export.
  - Keep layer behavior changes here unless they are pure data helpers.

- `editor-core.ts`
  - Side-effect-free editor data, types, constants, and canvas helper functions.
  - Good place for catalog data, layer math helpers, export helper primitives, and shared types.

- `editor-export.ts`
  - Canvas export composition for H5 / mini-program fallback paths.
  - Keep export drawing details here so `index.vue` does not mix canvas composition with touch/editing logic.

- `components/EditorTopbar.vue`
  - Brand, undo / redo, save, export controls.

- `components/StageToolRail.vue`
  - Draggable left-side canvas tool rail: zoom, grid, fit selection, layer drawer.

- `components/SelectionOverlay.vue`
  - Rectangular selected-layer overlay and four corner handles.
  - It only renders the overlay and emits actions; it should not decide selection state.

- `components/NudgeInspector.vue`
  - Scale / rotation micro-adjust capsule.
  - Emits input and step events back to `index.vue` so history commits stay centralized.

- `components/MaterialShelf.vue`
  - Bottom material drawer, big category tabs, subcategory tabs, and material grid.
  - It receives already-filtered `rowItems`; category state remains in `index.vue`.

- `components/LayerDrawer.vue`
  - Layer list, lock button, reorder drag handles.
  - Reorder math and final layer mutation stay in `index.vue`.

- `../../styles/gooda-theme.css`
  - Shared water-blue / iOS glass visual language for this editor.
  - Prefer adding reusable tokens here before introducing new one-off blues or glass styles.

- `../../services/qiandao/`
  - Future Qiandao integration boundary.
  - SPU search and backend-proxied OpenAPI calls should be introduced there first, then consumed by this page.

## Maintenance Rules

- Do not bind selected handles to `materialCollapsed`; selection follows `selected`, while drag affordances follow `layerDragging`.
- Keep the selected outline as a rectangular overlay. Circular layer content should stay visually circular, but selected state should remain rectangular.
- Keep business mutations centralized in `index.vue`: add, remove, duplicate, mirror, lock, reorder, save, undo, redo, export.
- Components should be mostly presentational: props in, events out.
- Big category tabs can use the expressive wave underline / sparkle style. Subcategory tabs should stay quieter.
- When changing UI, run `npm run build:h5` and verify the H5 page at `http://localhost:10086/#/pages/index/index`.
- Keep Qiandao app secrets and token exchange out of this page. Add a backend boundary before wiring private OpenAPI calls.
