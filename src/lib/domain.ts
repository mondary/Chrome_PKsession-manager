export function domainOf(url?: string) { try { return new URL(url ?? '').hostname.replace(/^www\./, ''); } catch { return ''; } }
export function isTrackableUrl(url?: string) { if (!url) return false; return /^(https?|file):/.test(url); }
export function stableStringify(value: unknown) { return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.keys(item).sort().reduce<Record<string, unknown>>((acc, key) => { acc[key] = item[key]; return acc; }, {}) : item); }
export async function hashState(value: unknown) { const data = new TextEncoder().encode(stableStringify(value)); const hash = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
