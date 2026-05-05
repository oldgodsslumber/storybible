import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';

import {
  watchCards,
  watchPlacements,
  watchConnections,
  watchCanvases,
  watchProject,
  watchAnnotations,
  updatePlacementPosition,
  updateAnnotation,
} from '@/firebase/db';
import { keyedDebounce } from '@/lib/debounce';
import type {
  Annotation,
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
  annotations: Annotation[]; // active canvas only
  activeCanvasId: string | null;

  // UI state
  selectedCardId: string | null;
  selectedConnectionId: string | null;
  detailCardId: string | null;
  libraryCollapsed: boolean;
  expandedPlacementIds: Set<string>;
  selectedAnnotationId: string | null;

  loadProject: (projectId: string) => void;
  unloadProject: () => void;
  setActiveCanvas: (canvasId: string) => void;
  selectCard: (cardId: string | null) => void;
  selectConnection: (connectionId: string | null) => void;
  openDetail: (cardId: string) => void;
  closeDetail: () => void;
  toggleLibrary: () => void;
  togglePlacementExpanded: (placementId: string) => void;
  selectAnnotation: (annotationId: string | null) => void;

  // Local-first placement update with debounced Firestore write.
  updatePlacementPositionLocal: (placementId: string, position: Position) => void;
  updateAnnotationLocal: (annotationId: string, patch: Partial<Annotation>) => void;
}

let unsubs: Unsubscribe[] = [];
let placementUnsub: Unsubscribe | null = null;
let annotationUnsub: Unsubscribe | null = null;

const flushPlacementWrite = keyedDebounce<[Position]>((placementId, position) => {
  const { projectId } = useProjectStore.getState();
  if (!projectId) return;
  void updatePlacementPosition(projectId, placementId, position);
}, 1500);

const flushAnnotationWrite = keyedDebounce<[Record<string, unknown>]>((annotationId, patch) => {
  const { projectId } = useProjectStore.getState();
  if (!projectId) return;
  void updateAnnotation(projectId, annotationId, patch);
}, 800);

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  project: null,
  cards: [],
  placements: [],
  connections: [],
  canvases: [],
  annotations: [],
  activeCanvasId: null,
  selectedCardId: null,
  selectedConnectionId: null,
  detailCardId: null,
  libraryCollapsed: false,
  expandedPlacementIds: new Set<string>(),
  selectedAnnotationId: null,

  loadProject: (projectId) => {
    get().unloadProject();
    set({ projectId });

    unsubs.push(
      watchProject(projectId, (project) => set({ project })),
      watchCards(projectId, (cards) => {
        set((s) => {
          // Clear stale detail/selection refs if their card is gone.
          const cardIds = new Set(cards.map((c) => c.id));
          const patch: Partial<ProjectState> = { cards };
          if (s.detailCardId && !cardIds.has(s.detailCardId)) patch.detailCardId = null;
          if (s.selectedCardId && !cardIds.has(s.selectedCardId)) patch.selectedCardId = null;
          return patch;
        });
      }),
      watchConnections(projectId, (connections) => {
        set((s) => {
          const ids = new Set(connections.map((c) => c.id));
          const patch: Partial<ProjectState> = { connections };
          if (s.selectedConnectionId && !ids.has(s.selectedConnectionId)) patch.selectedConnectionId = null;
          return patch;
        });
      }),
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
    if (placementUnsub) { placementUnsub(); placementUnsub = null; }
    if (annotationUnsub) { annotationUnsub(); annotationUnsub = null; }
    set({
      projectId: null,
      project: null,
      cards: [],
      placements: [],
      connections: [],
      canvases: [],
      annotations: [],
      activeCanvasId: null,
      selectedCardId: null,
      selectedConnectionId: null,
      detailCardId: null,
      expandedPlacementIds: new Set<string>(),
      selectedAnnotationId: null,
    });
  },

  setActiveCanvas: (canvasId) => {
    const { projectId } = get();
    if (!projectId) return;
    if (placementUnsub) placementUnsub();
    if (annotationUnsub) annotationUnsub();
    set({ activeCanvasId: canvasId, placements: [], annotations: [], selectedAnnotationId: null });
    placementUnsub = watchPlacements(projectId, canvasId, (placements) => set({ placements }));
    annotationUnsub = watchAnnotations(projectId, canvasId, (annotations) => {
      set((s) => {
        const ids = new Set(annotations.map((a) => a.id));
        const patch: Partial<ProjectState> = { annotations };
        if (s.selectedAnnotationId && !ids.has(s.selectedAnnotationId)) patch.selectedAnnotationId = null;
        return patch;
      });
    });
  },

  selectCard: (cardId) => set({ selectedCardId: cardId, selectedConnectionId: null }),
  selectConnection: (connectionId) =>
    set({ selectedConnectionId: connectionId, selectedCardId: null }),

  openDetail: (cardId) => set({ detailCardId: cardId, selectedCardId: cardId, selectedConnectionId: null }),
  closeDetail: () => set({ detailCardId: null }),
  toggleLibrary: () => set((s) => ({ libraryCollapsed: !s.libraryCollapsed })),
  selectAnnotation: (annotationId) =>
    set({ selectedAnnotationId: annotationId, selectedCardId: null, selectedConnectionId: null }),
  updateAnnotationLocal: (annotationId, patch) => {
    set((s) => ({
      annotations: s.annotations.map((a) =>
        a.id === annotationId ? ({ ...a, ...patch } as Annotation) : a,
      ),
    }));
    flushAnnotationWrite(annotationId, patch as Record<string, unknown>);
  },
  togglePlacementExpanded: (placementId) =>
    set((s) => {
      const next = new Set(s.expandedPlacementIds);
      if (next.has(placementId)) next.delete(placementId);
      else next.add(placementId);
      return { expandedPlacementIds: next };
    }),

  updatePlacementPositionLocal: (placementId, position) => {
    set((s) => ({
      placements: s.placements.map((p) =>
        p.id === placementId ? { ...p, position } : p,
      ),
    }));
    flushPlacementWrite(placementId, position);
  },
}));
