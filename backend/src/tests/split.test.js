import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplits,
  calculateExactSplits,
  calculatePercentageSplits,
  SplitValidationError,
} from '../services/splitService.js';

describe('splitService: Split calculation & validation rules', () => {
  it('divides ₹100.00 (10000 paise) equally among 3 persons with deterministic 1-paise remainder', () => {
    const persons = ['p-charlie', 'p-alice', 'p-bob'];
    const splits = calculateEqualSplits(10000, persons);

    expect(splits).toHaveLength(3);
    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(10000);

    // Sorted order: p-alice, p-bob, p-charlie
    // 10000 / 3 = 3333 with remainder 1
    // p-alice gets 3334, others get 3333
    expect(splits[0]).toEqual({ personId: 'p-alice', amount: 3334 });
    expect(splits[1]).toEqual({ personId: 'p-bob', amount: 3333 });
    expect(splits[2]).toEqual({ personId: 'p-charlie', amount: 3333 });
  });

  it('divides ₹100.00 among 7 persons and ensures exact sum match', () => {
    const persons = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const splits = calculateEqualSplits(10000, persons);

    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(10000);
  });

  it('validates exact splits that equal totalAmount', () => {
    const splitsInput = [
      { personId: 'p1', amount: 3000 },
      { personId: 'p2', amount: 2500 },
      { personId: 'p3', amount: 4500 },
    ];
    const splits = calculateExactSplits(10000, splitsInput);

    expect(splits).toHaveLength(3);
    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(10000);
  });

  it('throws error when exact splits do not match totalAmount', () => {
    const splitsInput = [
      { personId: 'p1', amount: 3000 },
      { personId: 'p2', amount: 2000 },
    ];
    expect(() => calculateExactSplits(10000, splitsInput)).toThrow(SplitValidationError);
  });

  it('calculates percentage splits using largest-remainder rounding and basis points (10000 bps = 100%)', () => {
    // 33.33%, 33.33%, 33.34% of 10000 paise (₹100)
    const splitsInput = [
      { personId: 'p1', basisPoints: 3333 },
      { personId: 'p2', basisPoints: 3333 },
      { personId: 'p3', basisPoints: 3334 },
    ];
    const splits = calculatePercentageSplits(10000, splitsInput);

    expect(splits).toHaveLength(3);
    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(10000);
  });

  it('throws error when basis points do not sum to 10000', () => {
    const splitsInput = [
      { personId: 'p1', basisPoints: 5000 },
      { personId: 'p2', basisPoints: 4000 },
    ];
    expect(() => calculatePercentageSplits(10000, splitsInput)).toThrow(
      'Sum of percentage splits must equal 100% (10000 basis points)'
    );
  });
});
