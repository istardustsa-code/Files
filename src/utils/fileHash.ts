import type { PortfolioFile } from '../types/platform';
import { getFileBundleId } from './formatters';

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function fallbackContentFingerprint(bytes: Uint8Array): string {
  // Deterministic 64-bit FNV-1a dual-lane fingerprint when Web Crypto Subtle is unavailable
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const step = bytes.length > 2_000_000 ? Math.floor(bytes.length / 500_000) : 1;
  for (let i = 0; i < bytes.length; i += step) {
    const b = bytes[i];
    h1 ^= b;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= b ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `fp:${bytes.length}:${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
}

/**
 * Computes an exact internal binary content hash (SHA-256) for a file/blob.
 * Used to detect files with identical internal content even if renamed.
 */
export async function computeFileContentHash(
  input: File | Blob | ArrayBuffer
): Promise<string> {
  const buffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return `sha256:${bytesToHex(new Uint8Array(digest))}`;
  }
  return fallbackContentFingerprint(new Uint8Array(buffer));
}

export function getFileContentHashKey(
  file: PortfolioFile,
  runtimeHashes?: Record<string, string>
): string | undefined {
  const originalHash = file.customFieldValues?._originalContentHash;
  if (typeof originalHash === 'string' && originalHash.trim()) {
    return originalHash.trim();
  }
  const storedHash = file.customFieldValues?._contentHash;
  if (typeof storedHash === 'string' && storedHash.trim()) {
    return storedHash.trim();
  }
  const runtime = runtimeHashes?.[file.id];
  return typeof runtime === 'string' && runtime.trim() ? runtime.trim() : undefined;
}

export interface DuplicateDetectionResult {
  duplicateFileIds: Set<string>;
  duplicatePeersByFileId: Map<string, PortfolioFile[]>;
  duplicateLogicalGroupsCount: number;
}

/**
 * Finds all active files whose internal content (SHA-256) matches at least one
 * other file owned by the same user.
 */
export function findContentDuplicateInfo(
  files: PortfolioFile[],
  runtimeHashes?: Record<string, string>
): DuplicateDetectionResult {
  const active = files.filter((f) => !f.isDeleted);
  const buckets = new Map<string, PortfolioFile[]>();

  for (const file of active) {
    const hash = getFileContentHashKey(file, runtimeHashes);
    if (!hash) continue;
    const key = `${file.ownerId}::${hash}`;
    const list = buckets.get(key);
    if (list) list.push(file);
    else buckets.set(key, [file]);
  }

  const duplicateFileIds = new Set<string>();
  const duplicatePeersByFileId = new Map<string, PortfolioFile[]>();
  let duplicateLogicalGroupsCount = 0;

  buckets.forEach((groupFiles) => {
    if (groupFiles.length < 2) return;

    // Group split-PDF chunks belonging to the same bundle into 1 logical unit
    const unitKeys = new Set<string>();
    const unitForFile = new Map<string, string>();
    for (const f of groupFiles) {
      const isSplitParent = Boolean(f.customFieldValues?._originalContentHash);
      const unitKey = isSplitParent ? getFileBundleId(f) || f.id : f.id;
      unitKeys.add(unitKey);
      unitForFile.set(f.id, unitKey);
    }

    if (unitKeys.size < 2) return;

    duplicateLogicalGroupsCount += 1;
    for (const f of groupFiles) {
      duplicateFileIds.add(f.id);
      const myUnit = unitForFile.get(f.id);
      const seenPeerUnits = new Set<string>();
      const peers: PortfolioFile[] = [];
      for (const candidate of groupFiles) {
        if (candidate.id === f.id) continue;
        const cUnit = unitForFile.get(candidate.id) ?? candidate.id;
        if (cUnit === myUnit || seenPeerUnits.has(cUnit)) continue;
        seenPeerUnits.add(cUnit);
        peers.push(candidate);
      }
      duplicatePeersByFileId.set(f.id, peers);
    }
  });

  return {
    duplicateFileIds,
    duplicatePeersByFileId,
    duplicateLogicalGroupsCount,
  };
}
