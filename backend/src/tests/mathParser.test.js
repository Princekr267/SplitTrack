import { describe, it, expect } from 'vitest';
import { safeEvaluate, calculateSplitBreakdown, MathParseError } from '../../../frontend/src/utils/mathParser.js';

describe('mathParser: Safe Shunting-Yard Evaluator', () => {
  it('correctly evaluates basic arithmetic with operator precedence', () => {
    expect(safeEvaluate('2 + 3 * 4')).toBe(14);
    expect(safeEvaluate('10 - 2 * 3')).toBe(4);
    expect(safeEvaluate('20 / 4 + 5')).toBe(10);
  });

  it('respects parentheses precedence', () => {
    expect(safeEvaluate('(2 + 3) * 4')).toBe(20);
    expect(safeEvaluate('100 / (10 + 15)')).toBe(4);
    expect(safeEvaluate('((2 + 3) * (4 + 2)) / 3')).toBe(10);
  });

  it('handles floating point decimals correctly without floating point noise', () => {
    expect(safeEvaluate('10.5 + 4.25')).toBe(14.75);
    expect(safeEvaluate('0.1 + 0.2')).toBe(0.3);
    expect(safeEvaluate('100.50 * 2')).toBe(201);
  });

  it('handles unicode mathematical symbols (×, ÷, −)', () => {
    expect(safeEvaluate('10 × 5')).toBe(50);
    expect(safeEvaluate('100 ÷ 4')).toBe(25);
    expect(safeEvaluate('50 − 15')).toBe(35);
  });

  it('handles unary negative numbers correctly', () => {
    expect(safeEvaluate('-10 + 25')).toBe(15);
    expect(safeEvaluate('10 * -5')).toBe(-50);
    expect(safeEvaluate('(-5 + 15) * 2')).toBe(20);
  });

  it('throws MathParseError on division by zero', () => {
    expect(() => safeEvaluate('100 / 0')).toThrow('Cannot divide by zero');
  });

  it('throws MathParseError on mismatched parentheses', () => {
    expect(() => safeEvaluate('(10 + 20')).toThrow(MathParseError);
    expect(() => safeEvaluate('10 + 20)')).toThrow(MathParseError);
  });

  it('throws MathParseError on invalid characters or double dots', () => {
    expect(() => safeEvaluate('10.5.2 + 2')).toThrow(MathParseError);
    expect(() => safeEvaluate('10 + alert(1)')).toThrow(MathParseError);
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
