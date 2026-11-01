/** Arcade bounds are separate from mass. Rapier still resolves ground and wall contact. */
export const MOTION_PHYSICS = Object.freeze({
  impulseFrictionPerSecond: 2.4,
  maxHorizontalReactionSpeed: 16,
  maxVerticalReactionSpeed: 10,
  collisionRestitution: 0.08,
  collisionTransfer: 1,
  minimumClosingSpeed: 0.35,
  ascendingContactLift: 1.5,
});
