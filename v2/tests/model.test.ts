import { describe, expect, it } from 'vitest';
import { compactVersions, diffVersions, isTrackableUrl, stateSignature, type SessionVersion, type TabState } from '../src/model';

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

  it('ignores presentation changes when deciding whether a session changed', () => {
    const first = version(1, [tab('old-id', 'https://same.test')]);
    const second = version(2, [{ ...tab('new-id', 'https://same.test'), title: 'Nouveau titre', active: true, thumbnail: 'data:image/jpeg;base64,x' }]);
    expect(stateSignature(first.state)).toBe(stateSignature(second.state));
    expect(diffVersions(first, second)).toEqual({ added: [], removed: [], changed: [] });
    expect(compactVersions([first, second])).toEqual([second]);
  });

  it('preserves window boundaries without depending on Chrome window ids', () => {
    const first = version(1, [{ ...tab('a'), windowId: 10 }, { ...tab('b'), windowId: 20 }]);
    const sameWindows = version(2, [{ ...tab('a'), windowId: 30 }, { ...tab('b'), windowId: 40 }]);
    const mergedWindow = version(3, [{ ...tab('a'), windowId: 50 }, { ...tab('b'), windowId: 50 }]);
    expect(stateSignature(first.state)).toBe(stateSignature(sameWindows.state));
    expect(stateSignature(first.state)).not.toBe(stateSignature(mergedWindow.state));
  });
});
