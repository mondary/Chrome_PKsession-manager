import { describe, expect, it } from 'vitest';
import { demoEvents, demoState } from '@/lib/demo';
import { positionEventLabels } from '@/features/journey/layout';

describe('journey acceptance scenario', () => {
  it('keeps a persistent lineage when the user returns to tab 1', () => {
    const projectEvents = demoEvents.filter((event) => event.tabId === 'pk');
    const searchEvents = demoEvents.filter((event) => event.tabId === 'search');
    expect(projectEvents.length).toBeGreaterThan(3);
    expect(searchEvents.length).toBe(5);
    expect(projectEvents.some((event) => event.timestamp > searchEvents.at(-1)!.timestamp)).toBe(true);
    expect(new Set(projectEvents.map((event) => event.tabId))).toEqual(new Set(['pk']));
  });

  it('provides the approved 78-tab session mix', () => {
    const tabs = demoState.windows.flatMap((window) => window.tabs);
    expect(tabs).toHaveLength(78);
    expect(tabs.filter((tab) => tab.discarded || tab.frozen)).toHaveLength(29);
    expect(tabs.filter((tab) => tab.pinned)).toHaveLength(6);
    expect(tabs.filter((tab) => tab.groupRef)).toHaveLength(42);
  });

  it('keeps dense event labels from overlapping', () => {
    const denseEvents = demoEvents.filter((event) => event.tabId === 'pk').slice(0, 4);
    const positioned = positionEventLabels(denseEvents, () => 100, 46);
    for (let index = 1; index < positioned.length; index += 1) {
      expect(positioned[index].labelY - positioned[index - 1].labelY).toBeGreaterThanOrEqual(46);
    }
    expect(positioned.every((item) => item.actualY === 100)).toBe(true);
  });
});
