import { LivenessAction } from './types';

export const LIVENESS_ACTIONS = [
  LivenessAction.BLINK,
  LivenessAction.SMILE,
  LivenessAction.LOOK_LEFT,
  LivenessAction.LOOK_RIGHT,
  LivenessAction.OPEN_MOUTH
];

// Using gemini-2.5-flash as it is robust for Vision/Multimodal tasks
export const MODEL_NAME = 'gemini-2.5-flash';

export const PLACEHOLDER_IMAGE = 'https://picsum.photos/400/300';