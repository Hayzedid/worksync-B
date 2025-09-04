export const STATUSES = ['pending', 'active', 'completed', 'archived'];

export function normalizeStatus(input) {
  if (input === undefined || input === null) return 'active';
  const s = String(input).trim().toLowerCase();
  // synonyms mapping
  const map = {
    'in_progress': 'active',
    'in-progress': 'active',
    'in progress': 'active',
    'on_hold': 'archived',
    'on-hold': 'archived',
    'on hold': 'archived',
    'done': 'completed'
  };
  if (map[s]) return map[s];
  if (STATUSES.includes(s)) return s;
  // default fallback
  return 'active';
}

export function statusOrder(status) {
  const idx = STATUSES.indexOf(status);
  return idx === -1 ? STATUSES.indexOf('active') : idx;
}
