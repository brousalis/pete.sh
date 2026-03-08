import { LabelType, Thresholds } from '@petehome/ui';

export const weatherThresholds: Thresholds = [
  { min: -10, max: 0, label: LabelType.DANGER },
  { min: 1, max: 15, label: LabelType.DEFAULT },
  { min: 16, max: 25, label: LabelType.WARNING },
  { min: 26, max: 35, label: LabelType.DANGER },
];
