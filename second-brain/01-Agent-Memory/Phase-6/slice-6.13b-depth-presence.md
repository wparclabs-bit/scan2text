# Slice 6.13b — Depth & Presence Pass

## What Changed

- **TopBar**: Removed `border-b` separator line. Added warm gradient overlay (`hsl(var(--accent)/0.05→transparent` light, `/0.06` dark) + soft downward box-shadow via `.topbar-header` class.
- **Lockup redesign**: Replaced pill/bordered wrapper with physical stamp tile (`.chip-tile`): h-8 w-8, rounded-lg, warm paper gradient bg, inset top highlight, soft outer shadow. Wordmark gains `tracking-wider`. Chip→wordmark gap set to 10px.
- **BottomBar**: Removed `border-t` separator line.
- **Panel depth**: All three panel cards now carry per-panel depth utility classes (`.depth-panel-left`, `.depth-panel-center`, `.depth-panel-right`) that layer a subtle top-darker vertical gradient overlay + updated inset highlight + soft outer shadow on top of existing surface gradients. Surface classes store base gradient in `--_panel-bg-img` CSS custom property so depth classes can compose via `var()`.
- **Ambient glow**: Workspace container (`<main>`) gets `.workspace-container` class with warm radial gradient (dark: `hsl(var(--accent)/0.14)`, light: `hsl(var(--accent)/0.04)`). Marker div `data-testid="ambient-glow"` placed inside center panel for testability (aria-hidden, pointer-events-none, data-state="static", no animate classes).
- **DropZone**: Inner dashed area stretched to `w-full` inside uniform p-4 padding, filling card width.

## Key Decisions

- Used CSS custom property `--_panel-bg-img` on surface classes so depth-panel classes can layer additional gradients without wiping the base. This avoids the 6.12e shorthand-background incident.
- Ambient glow marker placed inside center panel wrapper (not direct main child) to preserve the `main > div` count of 3 for existing grid overflow hygiene tests.
- No new i18n keys needed — purely visual changes.
- No new dependencies.

## Test Coverage

- TopBar: header no border-b, chip no pill/border wrapper, chip has .chip-tile class, wordmark has tracking-wider (+4 tests)
- CommandCenterLayout: ambient glow marker present with aria-hidden, pointer-events-none, data-state="static", no animate classes; radiant lines still center-only (+5 tests)
- BottomStatusBar: footer no border-t (+1 test)
- FileDropZone: dashed area has w-full (+1 test)
- QueuePanel: card carries .depth-panel-center (+1 test)
- PreviewPanel: empty state card carries .depth-panel-right (+1 test)
- **Total: 459 → 472 (+13 tests)**

## Open Questions

None.
