import { describe, it, expect } from 'vitest';
import { safeEvaluate, calculateSplitBreakdown, MathParseError } from '../../../frontend/src/utils/mathParser.js';

describe('mathParser: Safe Shunting-Yard Evaluator', () => {
  it('correctly evaluates basic arithmetic with operator precedence', () => {
    expect(safeEvaluate('2 + 3 * 4').result).toBe(14);
    expect(safeEvaluate('10 - 2 * 3').result).toBe(4);
    expect(safeEvaluate('20 / 4 + 5').result).toBe(10);
  });

  it('respects parentheses precedence', () => {
    expect(safeEvaluate('(2 + 3) * 4').result).toBe(20);
    expect(safeEvaluate('100 / (10 + 15)').result).toBe(4);
    expect(safeEvaluate('((2 + 3) * (4 + 2)) / 3').result).toBe(10);
  });

  it('handles floating point decimals correctly without floating point noise', () => {
    expect(safeEvaluate('10.5 + 4.25').result).toBe(14.75);
    expect(safeEvaluate('0.1 + 0.2').result).toBe(0.3);
    expect(safeEvaluate('100.50 * 2').result).toBe(201);
  });

  it('handles unicode mathematical symbols (×, ÷, −)', () => {
    expect(safeEvaluate('10 × 5').result).toBe(50);
    expect(safeEvaluate('100 ÷ 4').result).toBe(25);
    expect(safeEvaluate('50 − 15').result).toBe(35);
  });

  it('handles unary negative numbers correctly', () => {
    expect(safeEvaluate('-10 + 25').result).toBe(15);
    expect(safeEvaluate('10 * -5').result).toBe(-50);
    expect(safeEvaluate('(-5 + 15) * 2').result).toBe(20);
  });

  it('handles division by zero with error state', () => {
    const res = safeEvaluate('100 / 0');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Cannot divide by zero/i);
  });

  it('handles mismatched parentheses with error state', () => {
    expect(safeEvaluate('(10 + 20').success).toBe(false);
    expect(safeEvaluate('10 + 20)').success).toBe(false);
  });

  it('handles invalid characters or double dots with error state', () => {
    expect(safeEvaluate('10.5.2 + 2').success).toBe(false);
    expect(safeEvaluate('10 + alert(1)').success).toBe(false);
  });

  it('calculates split breakdown with explicit remainder handling in paise', () => {
    // ₹100 divided among 3 people
    const split = calculateSplitBreakdown(100, 3);
    expect(split.totalPaise).toBe(10000);
    expect(split.remainderPaise).toBe(1);
    expect(split.perPersonRupees).toEqual(['33.34', '33.33', '33.33']);

    // Sum of splits strictly equals 100
    const sum = split.perPersonRupees.reduce((acc, v) => acc + parseFloat(v), 0);
    expect(Math.round(sum * 100)).toBe(10000);
  });

  it('handles zero or single person split correctly', () => {
    const single = calculateSplitBreakdown(250, 1);
    expect(single.perPersonRupees).toEqual(['250.00']);
    expect(single.remainderPaise).toBe(0);
  });
});
