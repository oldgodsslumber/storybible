import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';

import {
  watchCards,
  watchPlacements,
  watchConnections,
  watchCanvases,
  watchProject,
  updatePlacementPosition,
} from '@/firebase/db';
import { keyedDebounce } from '@/lib/debounce';
import type {
  Card,
  CardPlacement,
  Canvas,
  Connection,
  Position,
  Project,
} from '@/schemas';

interface ProjectState {
  projectId: string | null;
  project: Project | null;
  cards: Card[];
  placements: CardPlacement[]; // for active canvas only
  connections: Connection[];
  canvases: Canvas[];
  activeCanvasId: string | null;

  // UI state
  selectedCardId: string | null;
  selectedConnectionId: string | null;

  loadProject: (projectId: string) => void;
  unloadProject: () => void;
  setActiveCanvas: (canvasId: string) => void;
  selectCard: (cardId: string | null) => void;
  selectConnection: (connectionId: string | null) => void;

  // Local-first placement update with debounced Firestore write.
  updatePlacementPositionLocal: (placementId: string, position: Position) => void;
}

let unsubs: Unsubscribe[] = [];
let placementUnsub: Unsubscribe | null = null;

const flushPlacementWrite = keyedDebounce<[Position]>((placementId, position) => {
  const { projectId } = useProjectStore.getState();
  if (!projectId) return;
  void updatePlacementPosition(projectId, placementId, position);
}, 1500);

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  project: null,
  cards: [],
  placements: [],
  connections: [],
  canvases: [],
  activeCanvasId: null,
  selectedCardId: null,
  selectedConnectionId: null,

  loadProject: (projectId) => {
    get().unloadProject();
    set({ projectId });

    unsubs.push(
      watchProject(projectId, (project) => set({ project })),
      watchCards(projectId, (cards) => set({ cards })),
      watchConnections(projectId, (connections) => set({ connections })),
      watchCanvases(projectId, (canvases) => {
        set({ canvases });
        // Default to freeform canvas if nothing selected.
        if (!get().activeCanvasId) {
          const freeform = canvases.find((c) => c.type === 'freeform') ?? canvases[0];
          if (freeform) get().setActiveCanvas(freeform.id);
        }
      }),
    );
  },

  unloadProject: () => {
    unsubs.forEach((u) => u());
    unsubs = [];
    if (placementUnsub) {
      placementUnsub();
      placementUnsub = null;
    }
    set({
      projectId: null,
      project: null,
      cards: [],
      placements: [],
      connections: [],
      canvases: [],
      activeCanvasId: null,
      selectedCardId: null,
      selectedConnectionId: null,
    });
  },

  setActiveCanvas: (canvasId) => {
    const { projectId } = get();
    if (!projectId) return;
    if (placementUnsub) placementUnsub();
    set({ activeCanvasId: canvasId, placements: [] });
    placementUnsub = watchPlacements(projectId, canvasId, (placements) => set({ placements }));
  },

  selectCard: (cardId) => set({ selectedCardId: cardId, selectedConnectionId: null }),
  selectConnection: (connectionId) =>
    set({ selectedConnectionId: connectionId, selectedCardId: null }),

  updatePlacementPositionLocal: (placementId, position) => {
    set((s) => ({
      placements: s.placements.map((p) =>
        p.id === placementId ? { ...p, position } : p,
      ),
    }));
    flushPlacementWrite(placementId, position);
  },
}));
