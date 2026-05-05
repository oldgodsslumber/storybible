import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './config';

// Firestore layout:
// users/{uid}
// projects/{projectId}
//   cards/{cardId}
//   placements/{placementId}
//   connections/{connectionId}
//   canvases/{canvasId}
//   versions/{versionId}

export const usersCol = () => collection(db, 'users');
export const userDoc = (uid: string) => doc(db, 'users', uid);

export const projectsCol = () => collection(db, 'projects');
export const projectDoc = (projectId: string) => doc(db, 'projects', projectId);

export const cardsCol = (projectId: string): CollectionReference =>
  collection(db, 'projects', projectId, 'cards');
export const cardDoc = (projectId: string, cardId: string): DocumentReference =>
  doc(db, 'projects', projectId, 'cards', cardId);

export const placementsCol = (projectId: string) =>
  collection(db, 'projects', projectId, 'placements');
export const placementDoc = (projectId: string, placementId: string) =>
  doc(db, 'projects', projectId, 'placements', placementId);

export const connectionsCol = (projectId: string) =>
  collection(db, 'projects', projectId, 'connections');
export const connectionDoc = (projectId: string, connectionId: string) =>
  doc(db, 'projects', projectId, 'connections', connectionId);

export const canvasesCol = (projectId: string) =>
  collection(db, 'projects', projectId, 'canvases');
export const canvasDoc = (projectId: string, canvasId: string) =>
  doc(db, 'projects', projectId, 'canvases', canvasId);

export const versionsCol = (projectId: string) =>
  collection(db, 'projects', projectId, 'versions');
export const versionDoc = (projectId: string, versionId: string) =>
  doc(db, 'projects', projectId, 'versions', versionId);

export const annotationsCol = (projectId: string) =>
  collection(db, 'projects', projectId, 'annotations');
export const annotationDoc = (projectId: string, annotationId: string) =>
  doc(db, 'projects', projectId, 'annotations', annotationId);
