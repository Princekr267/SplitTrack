import { springs, durations, easings } from './tokens.js';

/**
 * Reusable Motion Variants
 * Follows the 30% faster exit rule and animates only transform & opacity.
 */

export const fadeIn = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: durations.base,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

export const fadeUp = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.base,
      ease: easings.premium,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

export const scaleIn = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

export const staggerContainer = {
  hidden: {
    opacity: 0,
  },
  visible: (custom = {}) => ({
    opacity: 1,
    transition: {
      staggerChildren: custom.staggerChildren ?? 0.05,
      delayChildren: custom.delayChildren ?? 0.02,
    },
  }),
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const listItem = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.base,
      ease: easings.premium,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

export const slideInRight = {
  hidden: {
    opacity: 0,
    x: 16,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    x: -12,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

export const sheetUp = {
  hidden: {
    opacity: 0,
    y: '100%',
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: {
      duration: durations.base,
      ease: easings.easeIn,
    },
  },
};
