import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * Firebase is initialised at import time, which would try to reach the network
 * during tests. Component tests only care about rendering, so the whole module
 * is replaced with inert doubles.
 */
vi.mock('../lib/firebase', () => ({
  app: {},
  auth: { currentUser: null },
  db: {},
  googleProvider: {},
  onAuthStateChanged: () => () => {},
  signInWithPopup: vi.fn(),
  signInWithCustomToken: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  linkWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  updateProfile: vi.fn(),
  firebaseSignOut: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
  getDocs: vi.fn(async () => ({ docs: [], empty: true })),
  getCountFromServer: vi.fn(async () => ({ data: () => ({ count: 0 }) })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  increment: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn() })),
}));

// IntersectionObserver powers the feed's infinite scroll; jsdom lacks it.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// jsdom has no scrollTo / matchMedia.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}
