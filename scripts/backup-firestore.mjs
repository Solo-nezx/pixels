#!/usr/bin/env node
/**
 * Firestore backup — exports every collection to timestamped JSON.
 *
 * Firestore's scheduled export needs the paid Blaze plan, so this is the
 * free-tier equivalent: run it locally (or from any cron) whenever you want a
 * restorable snapshot.
 *
 *   node scripts/backup-firestore.mjs                 # ./backups/<timestamp>/
 *   node scripts/backup-firestore.mjs --out D:/mybak  # custom destination
 *   node scripts/backup-firestore.mjs --restore ./backups/2026-07-25T18-00-00
 *
 * Credentials, in order of preference:
 *   1. GOOGLE_APPLICATION_CREDENTIALS  → path to the service-account JSON
 *   2. FIREBASE_SERVICE_ACCOUNT        → the JSON itself, inline
 *
 * Never commit either one.
 */
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/** Top-level collections to snapshot, with the subcollections worth keeping. */
const COLLECTIONS = [
  { name: 'users', subcollections: ['gameLogs'] },
  { name: 'posts', subcollections: ['comments'] },
  { name: 'listings', subcollections: [] },
  { name: 'conversations', subcollections: ['messages'] },
  { name: 'notifications', subcollections: [] },
  { name: 'follows', subcollections: [] },
  { name: 'reports', subcollections: [] },
  { name: 'admins', subcollections: [] },
];

function credentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return cert(JSON.parse(raw));
  console.error(
    'No credentials. Set GOOGLE_APPLICATION_CREDENTIALS to your service-account\n' +
    'JSON path, or FIREBASE_SERVICE_ACCOUNT to its contents.',
  );
  process.exit(1);
}

function db() {
  if (!getApps().length) initializeApp({ credential: credentials() });
  return getFirestore();
}

async function exportCollection(firestore, name, subcollections) {
  const snap = await firestore.collection(name).get();
  const docs = [];
  for (const doc of snap.docs) {
    const entry = { id: doc.id, data: doc.data() };
    for (const sub of subcollections) {
      const subSnap = await doc.ref.collection(sub).get();
      if (!subSnap.empty) {
        entry.subcollections = entry.subcollections || {};
        entry.subcollections[sub] = subSnap.docs.map((d) => ({ id: d.id, data: d.data() }));
      }
    }
    docs.push(entry);
  }
  return docs;
}

async function backup(outRoot) {
  const firestore = db();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(outRoot, stamp);
  fs.mkdirSync(dir, { recursive: true });

  let total = 0;
  for (const { name, subcollections } of COLLECTIONS) {
    try {
      const docs = await exportCollection(firestore, name, subcollections);
      fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2), 'utf8');
      total += docs.length;
      console.log(`  ${name.padEnd(14)} ${String(docs.length).padStart(5)} docs`);
    } catch (e) {
      console.warn(`  ${name.padEnd(14)} skipped (${e.message})`);
    }
  }

  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), collections: COLLECTIONS, totalDocs: total }, null, 2),
    'utf8',
  );
  console.log(`\nBackup complete: ${dir} (${total} documents)`);
}

async function restore(dir) {
  const firestore = db();
  console.log(`Restoring from ${dir} — existing documents with the same ids will be overwritten.`);
  for (const { name, subcollections } of COLLECTIONS) {
    const file = path.join(dir, `${name}.json`);
    if (!fs.existsSync(file)) continue;
    const docs = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const entry of docs) {
      await firestore.collection(name).doc(entry.id).set(entry.data, { merge: true });
      for (const sub of subcollections) {
        for (const subDoc of entry.subcollections?.[sub] || []) {
          await firestore.collection(name).doc(entry.id).collection(sub).doc(subDoc.id).set(subDoc.data, { merge: true });
        }
      }
    }
    console.log(`  restored ${name} (${docs.length})`);
  }
  console.log('\nRestore complete.');
}

const args = process.argv.slice(2);
const restoreIdx = args.indexOf('--restore');
const outIdx = args.indexOf('--out');

if (restoreIdx !== -1) {
  const dir = args[restoreIdx + 1];
  if (!dir) { console.error('--restore needs a directory'); process.exit(1); }
  await restore(dir);
} else {
  await backup(outIdx !== -1 ? args[outIdx + 1] : './backups');
}
