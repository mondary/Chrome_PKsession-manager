import type { ActivityEventV1 } from '@/lib/types';

export interface PositionedEvent {
  event: ActivityEventV1;
  actualY: number;
  labelY: number;
}

export function positionEventLabels(events: ActivityEventV1[], yOf: (timestamp: number) => number, minimumGap = 46): PositionedEvent[] {
  let previousLabelY = Number.NEGATIVE_INFINITY;
  return events.filter((event) => event.type !== 'activated').map((event) => {
    const actualY = yOf(event.timestamp);
    const labelY = Math.max(actualY, previousLabelY + minimumGap);
    previousLabelY = labelY;
    return { event, actualY, labelY };
  });
}
