# Story Bible — M1

A spatial story bible for writers. M1 ships the core canvas + cards + library, no LLM features (those come in M3).

## What's in M1

- Firebase Auth (Google sign-in)
- Multiple projects per user
- Zod-validated data model: `Project`, `Card` (11 types), `CardPlacement`, `Connection`, `Canvas`, `CardVersion`
- Firestore subcollection storage (`projects/{id}/cards`, `placements`, `connections`, `canvases`, `versions`)
- Library/search panel with type filters, tag filter, and full-text search over title + body
- Freeform infinite canvas via React Flow with `onlyRenderVisibleElements` virtualization
- Drag from library to place a card; v1 enforces one placement per card per canvas
- Typed connections with per-project ontology (8 defaults seeded; users can add custom types/colors)
- Debounced auto-save of card edits (600 ms) and placement positions (1500 ms)
- PWA shell

The 5-act scene canvas is created on every project but renders an "M2" placeholder for now.

## Setup

1. Create a Firebase project, enable **Authentication → Google** and **Cloud Firestore**.
2. Copy `.env.example` to `.env` and fill in your Firebase web-app config.
3. Deploy security rules from `firestore.rules` and indexes from `firestore.indexes.json`.
4. Install and run:

   ```sh
   npm install
   npm run dev
   ```

## Project layout

```
src/
  schemas/        Zod schemas — single source of truth for the data model
  firebase/       Auth, Firestore client, paths, CRUD helpers
  store/          Zustand stores (auth + per-project)
  components/
    auth/         Sign-in screen
    projects/     Project list + create/delete
    workspace/    Top bar + workspace shell
    library/      Library/search sidebar
    canvas/       React Flow canvas + custom card node
    card/         Card detail panel
    connection/   Connection editor + ontology management
  lib/            debounce helpers
```

## Notes on architecture

- Cards are project-level, placements are canvas-scoped, connections are project-level. Editing a card updates it everywhere it's placed.
- The active canvas's placements are loaded via a separate listener; the library uses every card regardless of placement.
- Card writes flip `Project.summaryDirty = true` (via a batch with the card write) so M3's lazy summary regeneration has the signal it needs.
- React Flow nodes are keyed by **placement** id, not card id, so the same card on two canvases (a v1.1 feature) won't collide.
- `applyNodeChanges` is intentionally not used — the store updates `placements` synchronously when React Flow fires a position change, which both updates the UI and queues the debounced Firestore write.
```
