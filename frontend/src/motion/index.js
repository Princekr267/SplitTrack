/**
 * SplitPrism Central Motion Hub
 * Single source of truth for motion primitives, tokens, variants, and hooks.
 */

export {
  m,
  AnimatePresence,
  MotionConfig,
  LazyMotion,
  domAnimation,
  domMax,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from 'motion/react';

export * from './tokens.js';
export * from './variants.js';
export { useHoverCapable } from './useHoverCapable.js';
export { Reveal, Stagger, AnimatedNumber } from './components.jsx';
