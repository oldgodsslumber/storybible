import { useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Connection as RfConnection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  useReactFlow,
} from 'reactflow';

import { useProjectStore } from '@/store/projectStore';
import {
  createConnection,
  createPlacement,
  deletePlacement,
  deleteConnection,
} from '@/firebase/db';
import { CardNode, type CardNodeData } from './CardNode';
import { CARD_TYPE_META } from '@/schemas';

const nodeTypes = { card: CardNode };

export function CanvasView() {
  const projectId = useProjectStore((s) => s.projectId);
  const project = useProjectStore((s) => s.project);
  const cards = useProjectStore((s) => s.cards);
  const placements = useProjectStore((s) => s.placements);
  const connections = useProjectStore((s) => s.connections);
  const activeCanvasId = useProjectStore((s) => s.activeCanvasId);
  const activeCanvas = useProjectStore((s) =>
    s.canvases.find((c) => c.id === s.activeCanvasId) ?? null,
  );
  const selectedCardId = useProjectStore((s) => s.selectedCardId);
  const selectedConnectionId = useProjectStore((s) => s.selectedConnectionId);
  const selectCard = useProjectStore((s) => s.selectCard);
  const selectConnection = useProjectStore((s) => s.selectConnection);
  const updatePlacementPositionLocal = useProjectStore((s) => s.updatePlacementPositionLocal);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useReactFlow();

  const cardById = useMemo(() => {
    const m = new Map(cards.map((c) => [c.id, c]));
    return m;
  }, [cards]);

  const placedCardIds = useMemo(
    () => new Set(placements.map((p) => p.cardId)),
    [placements],
  );

  const nodes: Node<CardNodeData>[] = useMemo(() => {
    const out: Node<CardNodeData>[] = [];
    for (const p of placements) {
      const card = cardById.get(p.cardId);
      if (!card) continue;
      out.push({
        id: p.id, // node id == placement id
        type: 'card',
        position: p.position,
        data: { card, selected: card.id === selectedCardId },
        selected: card.id === selectedCardId,
      });
    }
    return out;
  }, [placements, cardById, selectedCardId]);

  const edges: Edge[] = useMemo(() => {
    if (!project) return [];
    const placementByCardId = new Map(placements.map((p) => [p.cardId, p]));
    return connections
      .filter((c) => placementByCardId.has(c.fromCardId) && placementByCardId.has(c.toCardId))
      .map((c) => {
        const ct = project.connectionTypes.find((t) => t.id === c.type);
        const color = ct?.color ?? '#94a3b8';
        const fromP = placementByCardId.get(c.fromCardId)!;
        const toP = placementByCardId.get(c.toCardId)!;
        return {
          id: c.id,
          source: fromP.id,
          target: toP.id,
          label: c.label || ct?.label || c.type,
          animated: false,
          style: { stroke: color, strokeWidth: 2 },
          labelStyle: { fill: color, fontSize: 11 },
          labelBgStyle: { fill: '#0f172a' },
          markerEnd: { type: 'arrowclosed', color } as any,
          selected: c.id === selectedConnectionId,
        } as Edge;
      });
  }, [connections, placements, project, selectedConnectionId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply position changes locally and let store debounce-write to Firestore.
      changes.forEach((ch) => {
        if (ch.type === 'position' && ch.position) {
          updatePlacementPositionLocal(ch.id, ch.position);
        }
      });
      // selection
      changes.forEach((ch) => {
        if (ch.type === 'select' && ch.selected) {
          const placement = placements.find((p) => p.id === ch.id);
          if (placement) selectCard(placement.cardId);
        }
      });
    },
    [updatePlacementPositionLocal, placements, selectCard],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    changes.forEach((ch) => {
      if (ch.type === 'select' && ch.selected) {
        selectConnection(ch.id);
      }
    });
  }, [selectConnection]);

  const onConnect = useCallback(
    async (params: RfConnection) => {
      if (!projectId || !project || !params.source || !params.target) return;
      const fromPlacement = placements.find((p) => p.id === params.source);
      const toPlacement = placements.find((p) => p.id === params.target);
      if (!fromPlacement || !toPlacement) return;
      if (fromPlacement.cardId === toPlacement.cardId) return;
      const defaultType = project.connectionTypes[0];
      const conn = await createConnection(
        projectId,
        fromPlacement.cardId,
        toPlacement.cardId,
        defaultType.id,
      );
      selectConnection(conn.id);
    },
    [projectId, project, placements, selectConnection],
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      if (!projectId) return;
      for (const e of deleted) {
        await deleteConnection(projectId, e.id);
      }
    },
    [projectId],
  );

  const onNodesDelete = useCallback(
    async (deleted: Node[]) => {
      if (!projectId) return;
      // Delete placements only — keep cards in library.
      for (const n of deleted) {
        await deletePlacement(projectId, n.id);
      }
    },
    [projectId],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!projectId || !activeCanvasId || !wrapperRef.current) return;
      const cardId = e.dataTransfer.getData('application/x-storybible-card');
      if (!cardId) return;
      if (placedCardIds.has(cardId)) return; // v1: one placement per card per canvas
      const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      await createPlacement(projectId, activeCanvasId, cardId, position);
    },
    [projectId, activeCanvasId, placedCardIds, rfInstance],
  );

  const onPaneClick = useCallback(() => {
    selectCard(null);
    selectConnection(null);
  }, [selectCard, selectConnection]);

  if (activeCanvas?.type === 'scene-5-act') {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        5-act scene canvas ships in M2.
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={onPaneClick}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'default' }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={24} color="#1e293b" />
        <Controls className="!bg-slate-900 !border-slate-800" />
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
