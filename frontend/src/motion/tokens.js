/**
 * Motion Tokens: Springs, Durations, and Bezier Easings
 * Central source of truth for physics-based animations across SplitOrbit.
 */

export const springs = {
  // Snappy: button presses, toggles, chips, quick feedback
  snappy: {
    type: 'spring',
    stiffness: 500,
    damping: 32,
    mass: 1,
  },
  // Smooth: card expansions, dialogs, segmented controls, tabs
  smooth: {
    type: 'spring',
    stiffness: 260,
    damping: 28,
    mass: 1,
  },
  // Gentle: floating sheets, tooltips, ambient indicators
  gentle: {
    type: 'spring',
    stiffness: 140,
    damping: 20,
    mass: 1,
  },
};

export const durations = {
  fast: 0.15, // Micro-interactions (hover, active, icon swaps)
  base: 0.25, // Dropdowns, cards, reveals
  slow: 0.4,  // Full-page transitions, bottom sheets
};

export const easings = {
  // Standard entrance easing (decelerating)
  easeOut: [0, 0, 0.2, 1],
  // Standard exit easing (accelerating, ~30% shorter)
  easeIn: [0.4, 0, 1, 1],
  // Custom cubic-bezier for premium reveals
  premium: [0.22, 1, 0.36, 1],
};

export const transitions = {
  snappy: { ...springs.snappy },
  smooth: { ...springs.smooth },
  gentle: { ...springs.gentle },
  fadeEnter: { duration: durations.base, ease: easings.easeOut },
  fadeExit: { duration: durations.fast, ease: easings.easeIn },
  reveal: { duration: durations.base, ease: easings.premium },
};
