/** Authored GLB is already Y-up, -Z forward, 2.5 m high. Never rescale its rig. */
export const TANK_LOCOMOTION = {
  clips: { run: 'Run_Stampede', idle: 'Idle_Mechanical', forward: 'Walk_Heavy', backward: 'Walk_Backward', left: 'WalkTurn_Left', right: 'WalkTurn_Right' },
  cycleDistance: 1.28,
  swingFraction: 0.22,
  blendSeconds: 0.2,
  turnAcceleration: 2.1,
  minimumSpeed: 0.018,
  footLift: 0.16,
  feet: [
    { name: 'Rear_L', phase: 0 }, { name: 'Front_L', phase: 0.25 },
    { name: 'Rear_R', phase: 0.5 }, { name: 'Front_R', phase: 0.75 },
  ],
} as const;
