import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FbUser,
} from 'firebase/auth';
import { setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider } from './config';
import { userDoc } from './paths';

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function signOut() {
  await fbSignOut(auth);
}

export function watchAuth(cb: (user: FbUser | null) => void) {
  return onAuthStateChanged(auth, cb);
}

async function ensureUserDoc(user: FbUser) {
  const ref = userDoc(user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    createdAt: Date.now(),
    _serverCreatedAt: serverTimestamp(),
  });
}
