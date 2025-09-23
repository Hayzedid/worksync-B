// Utility helpers for SQL parameter sanitization
export function sanitizeParam(v) {
  return v === undefined ? null : v;
}

export function sanitizeParams(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(sanitizeParam);
}

export default { sanitizeParam, sanitizeParams };
