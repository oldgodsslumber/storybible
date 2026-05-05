import { useCallback, useEffect, useMemo, useRef } from 'react';
import { nanoid } from 'nanoid';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  ConnectionMode,
  type Connection as RfConnection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type NodeMouseHandler,
  useReactFlow,
} from 'reactflow';

import { useProjectStore } from '@/store/projectStore';
import {
  createCard,
  createConnection,
  createPlacement,
  createAnnotation,
  deletePlacement,
  deleteConnection,
  deleteAnnotation,
  updateCard,
  updateConnection,
} from '@/firebase/db';
import { CardNode, type CardNodeData } from './CardNode';
import { StickyNode, type StickyNodeData } from './annotations/StickyNode';
import { TextNode, type TextNodeData } from './annotations/TextNode';
import { RectNode, type RectNodeData } from './annotations/RectNode';
import { LineNode, type LineNodeData } from './annotations/LineNode';
import { AnnotationInspector } from './annotations/Inspector';
import {
  CARD_TYPE_META,
  type CardType,
  CARD_TYPES,
  type Annotation,
  type AnnotationKind,
  ANNOTATION_KIND_META,
} from '@/schemas';
import { pickConnectionType } from '@/lib/connectionDefaults';

const nodeTypes = {
  card: CardNode,
  'ann-sticky': StickyNode,
  'ann-text': TextNode,
  'ann-rect': RectNode,
  'ann-line': LineNode,
};

function isCardType(v: string): v is CardType {
  return (CARD_TYPES as readonly string[]).includes(v);
}

function isAnnotationKind(v: string): v is AnnotationKind {
  return v === 'sticky' || v === 'text' || v === 'rect' || v === 'line';
}

function rectCenter(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function withAlpha(hex: string, alpha: number): string {
  // #rrggbb → rgba(r,g,b,alpha). Falls back to original on bad input.
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function createAnnotationOfKind(
  projectId: string,
  canvasId: string,
  kind: AnnotationKind,
  position: { x: number; y: number },
): Promise<Annotation> {
  const id = nanoid();
  const base = {
    id,
    projectId,
    canvasId,
    position,
    rotation: 0,
    color: ANNOTATION_KIND_META[kind].defaultColor,
    createdAt: Date.now(),
  };
  let ann: Annotation;
  switch (kind) {
    case 'sticky':
      ann = { ...base, kind: 'sticky', text: '', size: { w: 180, h: 140 } };
      break;
    case 'text':
      ann = { ...base, kind: 'text', text: 'Text', fontSize: 22 };
      break;
    case 'rect':
      ann = { ...base, kind: 'rect', size: { w: 200, h: 140 }, thickness: 2, filled: false };
      break;
    case 'line':
      ann = { ...base, kind: 'line', size: { w: 200, h: 8 }, thickness: 2 };
      break;
  }
  await createAnnotation(ann);
  return ann;
}

export function CanvasView() {
  const projectId = useProjectStore((s) => s.projectId);
  const project = useProjectStore((s) => s.project);
  const cards = useProjectStore((s) => s.cards);
  const placements = useProjectStore((s) => s.placements);
  const connections = useProjectStore((s) => s.connections);
  const annotations = useProjectStore((s) => s.annotations);
  const updateAnnotationLocal = useProjectStore((s) => s.updateAnnotationLocal);
  const activeCanvasId = useProjectStore((s) => s.activeCanvasId);
  const activeCanvas = useProjectStore((s) =>
    s.canvases.find((c) => c.id === s.activeCanvasId) ?? null,
  );
  const selectedCardId = useProjectStore((s) => s.selectedCardId);
  const selectedConnectionId = useProjectStore((s) => s.selectedConnectionId);
  const expandedPlacementIds = useProjectStore((s) => s.expandedPlacementIds);
  const selectCard = useProjectStore((s) => s.selectCard);
  const selectConnection = useProjectStore((s) => s.selectConnection);
  const selectAnnotation = useProjectStore((s) => s.selectAnnotation);
  const openDetail = useProjectStore((s) => s.openDetail);
  const updatePlacementPositionLocal = useProjectStore((s) => s.updatePlacementPositionLocal);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useReactFlow();

  // Alt-drag duplicate state.
  const altDragRef = useRef<{
    placementId: string;
    cardId: string;
    originalPosition: { x: number; y: number };
  } | null>(null);

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const placedCardIds = useMemo(() => new Set(placements.map((p) => p.cardId)), [placements]);

  // Hide placements whose card type isn't currently visible. Connections to
  // hidden cards are filtered out implicitly because the edge mapping only
  // renders edges where both endpoints have a visible placement.
  const typeFilter = useProjectStore((s) => s.typeFilter);
  const visiblePlacements = useMemo(
    () =>
      placements.filter((p) => {
        const card = cardById.get(p.cardId);
        return card ? typeFilter.has(card.type) : false;
      }),
    [placements, cardById, typeFilter],
  );

  // We mix card nodes and annotation nodes in one array. The 'type' string
  // routes each to the right renderer via nodeTypes above.
  type AnyNodeData = CardNodeData | StickyNodeData | TextNodeData | RectNodeData | LineNodeData;
  const selectedAnnotationId = useProjectStore((s) => s.selectedAnnotationId);

  const nodes: Node<AnyNodeData>[] = useMemo(() => {
    const out: Node<AnyNodeData>[] = [];
    for (const p of visiblePlacements) {
      const card = cardById.get(p.cardId);
      if (!card) continue;
      out.push({
        id: p.id,
        type: 'card',
        position: p.position,
        data: { card, placementId: p.id, expanded: expandedPlacementIds.has(p.id) },
        selected: card.id === selectedCardId,
      });
    }
    for (const a of annotations) {
      out.push({
        id: a.id,
        type: 'ann-' + a.kind,
        position: a.position,
        data: { annotation: a } as AnyNodeData,
        selected: a.id === selectedAnnotationId,
        // Annotations sit visually behind cards.
        zIndex: -1,
      });
    }
    return out;
  }, [visiblePlacements, cardById, selectedCardId, expandedPlacementIds, annotations, selectedAnnotationId]);

  const edges: Edge[] = useMemo(() => {
    if (!project) return [];
    const placementByCardId = new Map(visiblePlacements.map((p) => [p.cardId, p]));
    return connections
      .filter((c) => placementByCardId.has(c.fromCardId) && placementByCardId.has(c.toCardId))
      .map((c) => {
        const ct = project.connectionTypes.find((t) => t.id === c.type);
        const baseColor = ct?.color ?? '#94a3b8';
        const ghost = !!c.ghost;
        const stroke = ghost ? withAlpha(baseColor, 0.35) : baseColor;
        const fromP = placementByCardId.get(c.fromCardId)!;
        const toP = placementByCardId.get(c.toCardId)!;
        return {
          id: c.id,
          source: fromP.id,
          target: toP.id,
          sourceHandle: c.sourceHandle,
          targetHandle: c.targetHandle,
          label: ghost ? '' : c.label || ct?.label || c.type,
          style: { stroke, strokeWidth: ghost ? 1.5 : 2, strokeDasharray: ghost ? '4 4' : undefined },
          labelStyle: { fill: stroke, fontSize: 11 },
          labelBgStyle: { fill: '#0f172a' },
          markerEnd: { type: 'arrowclosed', color: stroke } as any,
          updatable: true,
          selected: c.id === selectedConnectionId,
        } as Edge;
      });
  }, [connections, visiblePlacements, project, selectedConnectionId]);

  const annotationIds = useMemo(() => new Set(annotations.map((a) => a.id)), [annotations]);

  // Limit fitView (Recenter button) to card placements so a stray annotation
  // far off-canvas can never make the recenter zoom out into nothingness.
  // Falls back to fitting all nodes if there are no placements yet.
  const fitViewOptions = useMemo(
    () =>
      visiblePlacements.length > 0
        ? { padding: 0.2, maxZoom: 1, nodes: visiblePlacements.map((p) => ({ id: p.id })) }
        : { padding: 0.2, maxZoom: 1 },
    [visiblePlacements],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((ch) => {
        if (ch.type === 'position' && ch.position) {
          if (annotationIds.has(ch.id)) {
            updateAnnotationLocal(ch.id, { position: ch.position } as Partial<Annotation>);
          } else {
            updatePlacementPositionLocal(ch.id, ch.position);
          }
        }
        // NOTE: do NOT persist dimensions here. RF fires `dimensions` changes
        // on every measurement (mount, layout, etc.), not just on user resize.
        // Persisting from this handler creates a write→snapshot→remount→write
        // loop. NodeResizer.onResizeEnd handles size persistence per-node.
        if (ch.type === 'select' && ch.selected) {
          if (annotationIds.has(ch.id)) {
            selectAnnotation(ch.id);
          } else {
            const placement = placements.find((p) => p.id === ch.id);
            if (placement) selectCard(placement.cardId);
          }
        }
      });
    },
    [updatePlacementPositionLocal, updateAnnotationLocal, annotationIds, placements, selectCard, selectAnnotation],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((ch) => {
        if (ch.type === 'select' && ch.selected) selectConnection(ch.id);
      });
    },
    [selectConnection],
  );

  const onConnect = useCallback(
    async (params: RfConnection) => {
      if (!projectId || !project || !params.source || !params.target) return;
      const fromPlacement = placements.find((p) => p.id === params.source);
      const toPlacement = placements.find((p) => p.id === params.target);
      if (!fromPlacement || !toPlacement) return;
      if (fromPlacement.cardId === toPlacement.cardId) return;
      const fromCard = cardById.get(fromPlacement.cardId);
      const toCard = cardById.get(toPlacement.cardId);
      const typeId =
        fromCard && toCard
          ? pickConnectionType(fromCard.type, toCard.type, project.connectionTypes)
          : project.connectionTypes[0].id;
      const conn = await createConnection(
        projectId,
        fromPlacement.cardId,
        toPlacement.cardId,
        typeId,
        {
          sourceHandle: params.sourceHandle ?? undefined,
          targetHandle: params.targetHandle ?? undefined,
        },
      );
      selectConnection(conn.id);
    },
    [projectId, project, placements, selectConnection],
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      if (!projectId) return;
      for (const e of deleted) await deleteConnection(projectId, e.id);
    },
    [projectId],
  );

  const onEdgeUpdate = useCallback(
    async (oldEdge: Edge, newConnection: RfConnection) => {
      if (!projectId) return;
      const fromPlacement = placements.find((p) => p.id === newConnection.source);
      const toPlacement = placements.find((p) => p.id === newConnection.target);
      if (!fromPlacement || !toPlacement) return;
      if (fromPlacement.cardId === toPlacement.cardId) return;
      await updateConnection(projectId, oldEdge.id, {
        fromCardId: fromPlacement.cardId,
        toCardId: toPlacement.cardId,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
      });
    },
    [projectId, placements],
  );

  const onNodesDelete = useCallback(
    async (deleted: Node[]) => {
      if (!projectId) return;
      for (const n of deleted) {
        if (annotationIds.has(n.id)) {
          await deleteAnnotation(projectId, n.id);
        } else {
          await deletePlacement(projectId, n.id);
        }
      }
    },
    [projectId, annotationIds],
  );

  // ----- Alt-drag duplicate -----
  const onNodeDragStart: NodeMouseHandler = useCallback((event, node) => {
    if (event.altKey) {
      altDragRef.current = {
        placementId: node.id,
        cardId: (node.data as CardNodeData).card.id,
        originalPosition: { ...node.position },
      };
    } else {
      altDragRef.current = null;
    }
  }, []);

  const onNodeDragStop: NodeMouseHandler = useCallback(
    async (_event, node) => {
      const ad = altDragRef.current;
      altDragRef.current = null;
      if (!ad || !projectId || !activeCanvasId) return;
      // Restore original placement to its starting position.
      updatePlacementPositionLocal(ad.placementId, ad.originalPosition);
      // Duplicate the card and place the copy at the dropped position.
      const sourceCard = cardById.get(ad.cardId);
      if (!sourceCard) return;
      const copy = await createCard(
        projectId,
        sourceCard.type,
        sourceCard.title ? `${sourceCard.title} (copy)` : '',
        sourceCard.body,
      );
      // Carry over tags/customFields/alwaysIncludeInRag.
      await updateCard(projectId, copy.id, {
        tags: sourceCard.tags,
        customFields: sourceCard.customFields,
        alwaysIncludeInRag: sourceCard.alwaysIncludeInRag,
      });
      await createPlacement(projectId, activeCanvasId, copy.id, node.position);
    },
    [projectId, activeCanvasId, cardById, updatePlacementPositionLocal],
  );

  // ----- Drop handling: type chip OR library card -----
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const t = e.dataTransfer.types;
    e.dataTransfer.dropEffect =
      t.includes('application/x-storybible-newcard') ||
      t.includes('application/x-storybible-newannotation')
        ? 'copy'
        : 'move';
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!projectId || !activeCanvasId) return;
      const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const newCardType = e.dataTransfer.getData('application/x-storybible-newcard');
      if (newCardType && isCardType(newCardType)) {
        const meta = CARD_TYPE_META[newCardType];
        const card = await createCard(projectId, newCardType, `New ${meta.label}`);
        await createPlacement(projectId, activeCanvasId, card.id, position);
        openDetail(card.id);
        return;
      }

      const newAnnKind = e.dataTransfer.getData('application/x-storybible-newannotation');
      if (newAnnKind && isAnnotationKind(newAnnKind)) {
        const ann = await createAnnotationOfKind(projectId, activeCanvasId, newAnnKind, position);
        useProjectStore.getState().selectAnnotation(ann.id);
        return;
      }

      const cardId = e.dataTransfer.getData('application/x-storybible-card');
      if (cardId) {
        if (placedCardIds.has(cardId)) return; // v1: one placement per card per canvas
        await createPlacement(projectId, activeCanvasId, cardId, position);
      }
    },
    [projectId, activeCanvasId, placedCardIds, rfInstance],
  );

  const onPaneClick = useCallback(() => {
    selectCard(null);
    selectConnection(null);
    selectAnnotation(null);
  }, [selectCard, selectConnection, selectAnnotation]);

  if (activeCanvas?.type === 'scene-5-act') {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        5-act scene canvas ships in M2.
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <AnnotationInspector />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        edgesUpdatable
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={onPaneClick}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'default' }}
        fitView
        fitViewOptions={fitViewOptions}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={24} color="#1e293b" />
        <Panel position="top-left">
          <button
            onClick={() => rfInstance.fitView(fitViewOptions)}
            title="Recenter on cards"
            className="rounded border border-slate-700 bg-slate-900/90 px-2 py-1 text-xs hover:bg-slate-800"
          >
            ↺ Recenter
          </button>
        </Panel>
        <Controls className="!bg-slate-900 !border-slate-800" fitViewOptions={fitViewOptions} />
        <MiniMap
          nodeColor={(n) => {
            const card = (n.data as CardNodeData | undefined)?.card;
            return card ? CARD_TYPE_META[card.type].color : '#475569';
          }}
          maskColor="rgba(15,23,42,0.7)"
          className="!bg-slate-900"
        />
      </ReactFlow>
    </div>
  );
}
