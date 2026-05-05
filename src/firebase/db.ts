import {
  collection,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';

import {
  CardSchema,
  CardPlacementSchema,
  CanvasSchema,
  ConnectionSchema,
  ProjectSchema,
  type Card,
  type CardPlacement,
  type Canvas,
  type Connection,
  type Project,
  type CardType,
  type Position,
  AnnotationSchema,
  type Annotation,
} from '@/schemas';
import { DEFAULT_CONNECTION_TYPES } from '@/schemas/connectionType';
import { db } from './config';
import {
  annotationDoc,
  annotationsCol,
  canvasDoc,
  canvasesCol,
  cardDoc,
  cardsCol,
  connectionDoc,
  connectionsCol,
  placementDoc,
  placementsCol,
  projectDoc,
  projectsCol,
} from './paths';
function parseAll<T>(snap: { docs: { data: () => DocumentData }[] }, schema: { parse: (v: unknown) => T }): T[] {
  return snap.docs.map((d) => schema.parse(d.data()));
}

// ---------------- Projects ----------------

export async function listProjectsForUser(uid: string): Promise<Project[]> {
  const q = query(projectsCol(), where('ownerId', '==', uid));
  const snap = await getDocs(q);
  return parseAll(snap, ProjectSchema);
}

export function watchProjectsForUser(
  uid: string,
  cb: (projects: Project[]) => void,
): Unsubscribe {
  const q = query(projectsCol(), where('ownerId', '==', uid));
  return onSnapshot(q, (snap) => cb(parseAll(snap, ProjectSchema)));
}

export async function createProject(name: string, ownerId: string): Promise<Project> {
  const id = nanoid();
  const now = Date.now();
  const project: Project = {
    id,
    name,
    ownerId,
    authorVoiceProfile: '',
    summaryText: '',
    summaryDirty: true,
    connectionTypes: DEFAULT_CONNECTION_TYPES,
    createdAt: now,
    updatedAt: now,
  };
  // Write the project doc FIRST, then the seed canvases. Firestore security
  // rules evaluate each doc in a batch independently and `get(parent)` sees
  // the pre-batch state — batching project + subcollection writes would
  // make the subcollection rule check fail because the parent doesn't yet
  // exist for the rule's get() call.
  await setDoc(projectDoc(id), project);

  const freeformId = nanoid();
  const sceneId = nanoid();
  const freeform: Canvas = {
    id: freeformId,
    projectId: id,
    name: 'Freeform',
    type: 'freeform',
    viewState: { pan: { x: 0, y: 0 }, zoom: 1 },
    createdAt: now,
  };
  const scene: Canvas = {
    id: sceneId,
    projectId: id,
    name: '5-Act Scenes',
    type: 'scene-5-act',
    viewState: { pan: { x: 0, y: 0 }, zoom: 1 },
    createdAt: now,
  };
  const batch = writeBatch(db);
  batch.set(canvasDoc(id, freeformId), freeform);
  batch.set(canvasDoc(id, sceneId), scene);
  await batch.commit();
  return project;
}

export async function updateProject(projectId: string, patch: Partial<Project>) {
  await updateDoc(projectDoc(projectId), { ...patch, updatedAt: Date.now() });
}

export async function deleteProject(projectId: string) {
  // Best-effort cascade. For v1 with bounded sizes, batch-delete subcollections.
  const subcols = ['cards', 'placements', 'connections', 'canvases', 'versions'];
  for (const sub of subcols) {
    const snap = await getDocs(collection(db, 'projects', projectId, sub));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(projectDoc(projectId));
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(projectDoc(projectId));
  return snap.exists() ? ProjectSchema.parse(snap.data()) : null;
}

export function watchProject(projectId: string, cb: (p: Project | null) => void): Unsubscribe {
  return onSnapshot(projectDoc(projectId), (snap) => {
    cb(snap.exists() ? ProjectSchema.parse(snap.data()) : null);
  });
}

// ---------------- Canvases ----------------

export function watchCanvases(projectId: string, cb: (canvases: Canvas[]) => void): Unsubscribe {
  return onSnapshot(canvasesCol(projectId), (snap) => cb(parseAll(snap, CanvasSchema)));
}

export async function updateCanvasViewState(
  projectId: string,
  canvasId: string,
  viewState: Canvas['viewState'],
) {
  await updateDoc(canvasDoc(projectId, canvasId), { viewState });
}

// ---------------- Cards ----------------

export function watchCards(projectId: string, cb: (cards: Card[]) => void): Unsubscribe {
  return onSnapshot(cardsCol(projectId), (snap) => cb(parseAll(snap, CardSchema)));
}

export async function createCard(
  projectId: string,
  type: CardType,
  title = '',
  body = '',
): Promise<Card> {
  const id = nanoid();
  const now = Date.now();
  const card: Card = {
    id,
    projectId,
    type,
    title,
    body,
    customFields: {},
    tags: [],
    alwaysIncludeInRag: false,
    createdAt: now,
    updatedAt: now,
  };
  const batch = writeBatch(db);
  batch.set(cardDoc(projectId, id), card);
  // Mark project summary dirty
  batch.update(projectDoc(projectId), { summaryDirty: true, updatedAt: now });
  await batch.commit();
  return card;
}

export async function updateCard(projectId: string, cardId: string, patch: Partial<Card>) {
  const now = Date.now();
  const batch = writeBatch(db);
  batch.update(cardDoc(projectId, cardId), { ...patch, updatedAt: now });
  batch.update(projectDoc(projectId), { summaryDirty: true, updatedAt: now });
  await batch.commit();
}

export async function deleteCard(projectId: string, cardId: string) {
  // Remove card, its placements, and its connections.
  const batch = writeBatch(db);
  batch.delete(cardDoc(projectId, cardId));

  const placements = await getDocs(
    query(placementsCol(projectId), where('cardId', '==', cardId)),
  );
  placements.docs.forEach((d) => batch.delete(d.ref));

  const fromConns = await getDocs(
    query(connectionsCol(projectId), where('fromCardId', '==', cardId)),
  );
  fromConns.docs.forEach((d) => batch.delete(d.ref));

  const toConns = await getDocs(
    query(connectionsCol(projectId), where('toCardId', '==', cardId)),
  );
  toConns.docs.forEach((d) => batch.delete(d.ref));

  batch.update(projectDoc(projectId), { summaryDirty: true, updatedAt: Date.now() });
  await batch.commit();
}

// ---------------- Placements ----------------

export function watchPlacements(
  projectId: string,
  canvasId: string,
  cb: (placements: CardPlacement[]) => void,
): Unsubscribe {
  const q = query(placementsCol(projectId), where('canvasId', '==', canvasId));
  return onSnapshot(q, (snap) => cb(parseAll(snap, CardPlacementSchema)));
}

export async function createPlacement(
  projectId: string,
  canvasId: string,
  cardId: string,
  position: Position,
): Promise<CardPlacement> {
  // v1: enforce one placement per card per canvas.
  const existing = await getDocs(
    query(
      placementsCol(projectId),
      where('canvasId', '==', canvasId),
      where('cardId', '==', cardId),
    ),
  );
  if (!existing.empty) {
    return CardPlacementSchema.parse(existing.docs[0].data());
  }
  const id = nanoid();
  const placement: CardPlacement = {
    id,
    projectId,
    cardId,
    canvasId,
    position,
    createdAt: Date.now(),
  };
  await setDoc(placementDoc(projectId, id), placement);
  return placement;
}

export async function updatePlacementPosition(
  projectId: string,
  placementId: string,
  position: Position,
) {
  await updateDoc(placementDoc(projectId, placementId), { position });
}

export async function deletePlacement(projectId: string, placementId: string) {
  await deleteDoc(placementDoc(projectId, placementId));
}

// ---------------- Connections ----------------

export function watchConnections(
  projectId: string,
  cb: (connections: Connection[]) => void,
): Unsubscribe {
  return onSnapshot(connectionsCol(projectId), (snap) => cb(parseAll(snap, ConnectionSchema)));
}

export async function createConnection(
  projectId: string,
  fromCardId: string,
  toCardId: string,
  type: string,
  opts: { label?: string; sourceHandle?: string; targetHandle?: string } = {},
): Promise<Connection> {
  const id = nanoid();
  const conn: Connection = {
    id,
    projectId,
    fromCardId,
    toCardId,
    type,
    label: opts.label ?? '',
    ghost: false,
    ...(opts.sourceHandle ? { sourceHandle: opts.sourceHandle } : {}),
    ...(opts.targetHandle ? { targetHandle: opts.targetHandle } : {}),
    createdAt: Date.now(),
  };
  await setDoc(connectionDoc(projectId, id), conn);
  return conn;
}

export async function updateConnection(
  projectId: string,
  connectionId: string,
  patch: Partial<Connection>,
) {
  await updateDoc(connectionDoc(projectId, connectionId), patch);
}

export async function deleteConnection(projectId: string, connectionId: string) {
  await deleteDoc(connectionDoc(projectId, connectionId));
}

// ---------------- Annotations (canvas-scoped) ----------------

export function watchAnnotations(
  projectId: string,
  canvasId: string,
  cb: (annotations: Annotation[]) => void,
): Unsubscribe {
  const q = query(annotationsCol(projectId), where('canvasId', '==', canvasId));
  return onSnapshot(q, (snap) => {
    const out: Annotation[] = [];
    for (const d of snap.docs) {
      const parsed = AnnotationSchema.safeParse(d.data());
      if (parsed.success) out.push(parsed.data);
    }
    cb(out);
  });
}

export async function createAnnotation(annotation: Annotation): Promise<Annotation> {
  await setDoc(annotationDoc(annotation.projectId, annotation.id), annotation);
  return annotation;
}

export async function updateAnnotation(
  projectId: string,
  annotationId: string,
  patch: Record<string, unknown>,
) {
  await updateDoc(annotationDoc(projectId, annotationId), patch);
}

export async function deleteAnnotation(projectId: string, annotationId: string) {
  await deleteDoc(annotationDoc(projectId, annotationId));
}
