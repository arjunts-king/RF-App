import type { PortMaster, SalesInvoice } from '../types/index.ts';

/**
 * Normalizes a port name into a canonical comparison key so variants like
 * "Port of Lat Krabang", "Lat Krabang Port", and "Lat Krabang, Thailand"
 * resolve to the same key ("latkrabang").
 */
export function normalizePortKey(name: string): string {
  const raw = String(name || '').toLowerCase().trim();
  if (!raw) return '';

  // Drop trailing ", Country" / ", State" qualifiers when normalizing port name
  const beforeComma = raw.split(',')[0].trim();
  const cleaned = beforeComma
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|port|of|seaport|harbour|harbor|terminal|icd)\b/g, ' ')
    .replace(/\s+/g, '');

  if (cleaned) return cleaned;

  // Fallback if the name only consisted of stop words
  return raw.replace(/[^a-z0-9]/g, '');
}

const GENERIC_COUNTRIES = new Set(['', 'overseas', 'global', 'unknown', 'other', 'n/a']);

function isRealCountry(country?: string): boolean {
  return !GENERIC_COUNTRIES.has(String(country || '').trim().toLowerCase());
}

function isRealUnLocode(code?: string): boolean {
  const c = String(code || '').trim().toUpperCase();
  return /^[A-Z]{5}$/.test(c) && c !== 'PORTO';
}

function scoreCanonicalPort(
  port: PortMaster,
  index: number,
  refCount: number,
  verifiedPortIds?: Set<string>
): number {
  let score = 0;

  // Prefer verified / non-timestamped original master IDs
  const isVerified =
    (verifiedPortIds && verifiedPortIds.has(port.id)) ||
    !/^port-\d{10,}/.test(port.id);
  if (isVerified) score += 1000;

  if (isRealUnLocode(port.code)) score += 100;
  if (isRealCountry(port.country)) score += 50;
  if (port.active !== false) score += 20;

  // Prefer cleaner names without redundant "Port of " when everything else is tied
  score += Math.min(refCount, 50) * 2;
  // Earlier entry wins ties
  score -= index * 0.001;

  return score;
}

export interface PortDeduplicationResult {
  ports: PortMaster[];
  salesInvoices: SalesInvoice[];
  removedCount: number;
  remappedInvoices: number;
  mergedPairs: Array<{ duplicateId: string; duplicateName: string; keptId: string; keptName: string }>;
}

/**
 * Deduplicates PortMaster records by normalized port key, keeps the best
 * original/canonical port per group, and remaps all SalesInvoice port
 * references (POL, POD, Final Destination) to the kept port without losing
 * any invoice data.
 */
export function deduplicatePortsWithInvoices(
  ports: PortMaster[],
  salesInvoices: SalesInvoice[],
  verifiedPortIds?: Set<string>
): PortDeduplicationResult {
  if (!Array.isArray(ports) || ports.length <= 1) {
    return {
      ports: ports || [],
      salesInvoices: salesInvoices || [],
      removedCount: 0,
      remappedInvoices: 0,
      mergedPairs: []
    };
  }

  // Count invoice references per port ID for tie-breaking
  const refCounts = new Map<string, number>();
  for (const inv of salesInvoices || []) {
    for (const pid of [inv.portOfLoadingId, inv.portOfDischargeId, inv.finalDestinationId]) {
      if (pid) refCounts.set(pid, (refCounts.get(pid) || 0) + 1);
    }
  }

  // Group ports by normalized key
  const groups = new Map<string, Array<{ port: PortMaster; index: number }>>();
  ports.forEach((port, index) => {
    const key = normalizePortKey(port.name) || `__raw_${port.id}`;
    const list = groups.get(key) || [];
    list.push({ port, index });
    groups.set(key, list);
  });

  const duplicateToCanonical = new Map<string, PortMaster>();
  const enrichedCanonicalById = new Map<string, PortMaster>();
  const mergedPairs: Array<{ duplicateId: string; duplicateName: string; keptId: string; keptName: string }> = [];

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    // Sort descending by canonical score
    const sorted = [...group].sort((a, b) => {
      const sa = scoreCanonicalPort(a.port, a.index, refCounts.get(a.port.id) || 0, verifiedPortIds);
      const sb = scoreCanonicalPort(b.port, b.index, refCounts.get(b.port.id) || 0, verifiedPortIds);
      return sb - sa;
    });

    const kept = { ...sorted[0].port };
    for (let i = 1; i < sorted.length; i++) {
      const dup = sorted[i].port;
      // Enrich kept port if it lacks a real country or UN/LOCODE that the duplicate had
      if (!isRealCountry(kept.country) && isRealCountry(dup.country)) {
        kept.country = dup.country;
      }
      if (!isRealUnLocode(kept.code) && isRealUnLocode(dup.code)) {
        kept.code = dup.code;
      }
      if (!kept.active && dup.active) {
        kept.active = true;
      }
      duplicateToCanonical.set(dup.id, kept);
      mergedPairs.push({
        duplicateId: dup.id,
        duplicateName: dup.name,
        keptId: kept.id,
        keptName: kept.name
      });
    }
    enrichedCanonicalById.set(kept.id, kept);
  }

  if (duplicateToCanonical.size === 0) {
    return {
      ports,
      salesInvoices,
      removedCount: 0,
      remappedInvoices: 0,
      mergedPairs: []
    };
  }

  // Ensure every duplicate points to the final enriched canonical object
  for (const [dupId, target] of duplicateToCanonical.entries()) {
    const enriched = enrichedCanonicalById.get(target.id);
    if (enriched) duplicateToCanonical.set(dupId, enriched);
  }

  const deduplicatedPorts = ports
    .filter((p) => !duplicateToCanonical.has(p.id))
    .map((p) => enrichedCanonicalById.get(p.id) || p);

  let remappedInvoices = 0;
  const updatedInvoices = (salesInvoices || []).map((inv) => {
    let changed = false;
    const next = { ...inv };

    const polTarget = duplicateToCanonical.get(inv.portOfLoadingId);
    if (polTarget) {
      next.portOfLoadingId = polTarget.id;
      if (next.portOfLoading !== undefined) next.portOfLoading = polTarget.name;
      changed = true;
    }

    const podTarget = duplicateToCanonical.get(inv.portOfDischargeId);
    if (podTarget) {
      next.portOfDischargeId = podTarget.id;
      if (next.portOfDischarge !== undefined) next.portOfDischarge = podTarget.name;
      changed = true;
    }

    const destTarget = duplicateToCanonical.get(inv.finalDestinationId);
    if (destTarget) {
      next.finalDestinationId = destTarget.id;
      if (next.finalDestination !== undefined) next.finalDestination = destTarget.name;
      changed = true;
    }

    if (changed) remappedInvoices++;
    return next;
  });

  return {
    ports: deduplicatedPorts,
    salesInvoices: updatedInvoices,
    removedCount: duplicateToCanonical.size,
    remappedInvoices,
    mergedPairs
  };
}
