import { describe, expect, it } from 'vitest';
import { domainOf, hashState, isTrackableUrl, stableStringify } from '@/lib/domain';

describe('URL privacy and state identity', () => {
  it('accepts restorable web and file URLs only', () => {
    expect(isTrackableUrl('https://example.com/a?b=1')).toBe(true);
    expect(isTrackableUrl('file:///Users/me/notes.html')).toBe(true);
    expect(isTrackableUrl('chrome://settings')).toBe(false);
    expect(isTrackableUrl('chrome-extension://id/app.html')).toBe(false);
  });

  it('normalizes domains without losing URL details elsewhere', () => {
    expect(domainOf('https://www.example.com/path?q=private#hash')).toBe('example.com');
  });

  it('hashes objects independently from key insertion order', async () => {
    const left = { windows: [{ id: 'w', tabs: [{ url: 'https://a.test', pinned: true }] }], version: 1 };
    const right = { version: 1, windows: [{ tabs: [{ pinned: true, url: 'https://a.test' }], id: 'w' }] };
    expect(stableStringify(left)).toBe(stableStringify(right));
    expect(await hashState(left)).toBe(await hashState(right));
  });
});
