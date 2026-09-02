import { describe, expect, it } from 'vitest';
import { diffVersions, isTrackableUrl, type SessionVersion, type TabState } from '../src/model';

const tab = (id: string, url = `https://${id}.test`): TabState => ({ id, title: id, url, index: 0, pinned: false, sleeping: false, active: false });
const version = (number: number, tabs: TabState[]): SessionVersion => ({ id: String(number), number, createdAt: number, reason: 'change', stateHash: String(number), state: { groups: [], tabs } });

describe('session versions', () => {
  it('reports composition changes between immutable versions', () => {
    const diff = diffVersions(version(1, [tab('kept'), tab('closed')]), version(2, [tab('kept', 'https://changed.test'), tab('opened')]));
    expect(diff.added.map((item) => item.id)).toEqual(['opened']);
    expect(diff.removed.map((item) => item.id)).toEqual(['closed']);
    expect(diff.changed.map((item) => item.id)).toEqual(['kept']);
  });

  it('counts only tabs that belong to a restorable web session', () => {
    expect(['https://example.com', 'chrome://extensions', ''].filter(isTrackableUrl)).toEqual(['https://example.com']);
  });
});
