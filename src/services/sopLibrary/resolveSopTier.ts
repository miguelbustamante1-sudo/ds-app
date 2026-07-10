const TIER_MAP: Record<string, number> = {
  'sop:tlteam': 2,
  'sop:ltteam': 3,
  'sop:bsa':    4,
  'admin':      5,
};

export function resolveSopTier(roles: string[]): number {
  return roles.reduce((highest, role) => {
    const tier = TIER_MAP[role] ?? 0;
    return tier > highest ? tier : highest;
  }, 1);
}
