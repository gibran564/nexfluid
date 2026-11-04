/**
 * @eclipsis/core — NexFluid, el motor de movimiento orgánico.
 *
 * No depende de ningún framework ni de los componentes. Todo lo que no se
 * exporta aquí es interno.
 */
export { stepSpring, measureStepResponse, dampingRatio, naturalFrequency, dampingForRatio, FluidValue } from './spring.ts';
export type { SpringParams, SpringState, StepResponse } from './spring.ts';
export { MOTION_PRESETS, resolveMotion, isMotionPresetName } from './presets.ts';
export type { MotionPreset, MotionPresetName, MotionOverrides } from './presets.ts';
export { FluidClock, sharedClock } from './clock.ts';
export type { Tick, ClockHost, FluidClockOptions } from './clock.ts';
export { createMotionPreference, sharedMotionPreference } from './motion-preference.ts';
export type { MotionMode, MotionPreference } from './motion-preference.ts';
export { baseRadius, makeHarmonics, sampleContour, mixContours, polygonArea, toSmoothPath, seededRandom } from './shape.ts';
export type { Point, BaseGeometry, Harmonic, Deformation, ContourOptions } from './shape.ts';
export { membraneOutline, membranePath, morphMembranes, liquidCapsule, MEMBRANE_POINTS } from './membrane.ts';
export type { MembraneOptions } from './membrane.ts';
export {
  MORPH_PHYSICS, resolveMorphPhysics, isMorphPhysicsName, dampingForOvershoot, overshootOf, morphTimeline, morphTiming,
  morphRect, morphPath, deformContour, resampleContour, alignContours, metaballPath, MorphTransition,
} from './morph.ts';
export type {
  MorphPhysics, MorphPhysicsName, MorphPhysicsOverrides, MorphTarget, MorphSample, MorphTimeline, Rect, MorphEndpoint,
  MorphState, MorphFrame, MorphPathOptions, Circle, MorphTransitionOptions,
} from './morph.ts';
export { createFluidBlob } from './fluid-blob.ts';
export type { FluidBlobOptions, FluidBlobHandle } from './fluid-blob.ts';
export { scrollThumb, offsetForThumb, markerPosition, activeSection, scrollThumbPath, ScrollTracker } from './scroll.ts';
export type {
  ScrollOrientation, ScrollMetrics, ThumbGeometry, ThumbPathOptions, ScrollSection, ScrollParts, ScrollState, ScrollTrackerOptions,
} from './scroll.ts';
