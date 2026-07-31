import { Branch } from '../types';

export function normalizeAadhaar(aadhaar: string): string {
  return aadhaar.replace(/[\s-]/g, '');
}

export function formatAadhaar(aadhaar: string): string {
  const clean = normalizeAadhaar(aadhaar).slice(0, 12);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function isValidAadhaar(aadhaar: string): boolean {
  return /^\d{12}$/.test(normalizeAadhaar(aadhaar));
}

export function calculateTieredIncentive(
  branch: Branch | undefined,
  presentDays: number,
  subDepotCategory?: string
): number {
  if (!branch) return 0;

  const tiers = branch.incentiveTiers || [];

  if (tiers.length === 0) {
    if (subDepotCategory !== 'DRIVERS') return 0;
    return presentDays >= 24 ? (branch.driverMonthlyIncentive || 2000) : 0;
  }

  const matched = tiers.find(t => presentDays >= t.minDays && presentDays <= t.maxDays);
  return matched ? matched.amount : 0;
}
