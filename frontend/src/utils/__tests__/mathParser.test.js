import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeEvaluate, calculateSplitBreakdown } from '../mathParser.js';

describe('Safe Math Parser (Shunting-Yard)', () => {
  it('evaluates basic operator precedence: 2+3*4 = 14', () => {
    const res = safeEvaluate('2+3*4');
    assert.equal(res.success, true);
    assert.equal(res.result, 14);
    assert.equal(res.error, null);
  });

  it('evaluates parentheses precedence: (2+3)*4 = 20', () => {
    const res = safeEvaluate('(2+3)*4');
    assert.equal(res.success, true);
    assert.equal(res.result, 20);
    assert.equal(res.error, null);
  });

  it('evaluates division: 10/4 = 2.5', () => {
    const res = safeEvaluate('10/4');
    assert.equal(res.success, true);
    assert.equal(res.result, 2.5);
    assert.equal(res.error, null);
  });

  it('evaluates percentage in subtraction: 100-10% = 90', () => {
    const res = safeEvaluate('100-10%');
    assert.equal(res.success, true);
    assert.equal(res.result, 90);
    assert.equal(res.error, null);
  });

  it('evaluates percentage in addition and multiplication', () => {
    const resAdd = safeEvaluate('100+10%');
    assert.equal(resAdd.success, true);
    assert.equal(resAdd.result, 110);

    const resMul = safeEvaluate('200*15%');
    assert.equal(resMul.success, true);
    assert.equal(resMul.result, 30);
  });

  it('evaluates nested parentheses correctly', () => {
    const res = safeEvaluate('((2+3)*(4-1))');
    assert.equal(res.success, true);
    assert.equal(res.result, 15);
    assert.equal(res.error, null);

    const res2 = safeEvaluate('10 + (2 * (3 + 1))');
    assert.equal(res2.success, true);
    assert.equal(res2.result, 18);
  });

  it('handles decimals without floating point noise', () => {
    const res = safeEvaluate('12.5 + 3.75');
    assert.equal(res.success, true);
    assert.equal(res.result, 16.25);

    const resPrecision = safeEvaluate('0.1 + 0.2');
    assert.equal(resPrecision.success, true);
    assert.equal(resPrecision.result, 0.3);
  });

  it('handles division by zero with an error state (not Infinity or crash)', () => {
    const res = safeEvaluate('10/0');
    assert.equal(res.success, false);
    assert.equal(res.result, null);
    assert.match(res.error, /cannot divide by zero/i);
  });

  it('handles malformed inputs with error states (not uncaught exceptions)', () => {
    const malformedCases = ['2++3', '(2+3', '2+3)', '10/', '*5', 'abc', '1.2.3', '..'];

    for (const expr of malformedCases) {
      assert.doesNotThrow(() => {
        const res = safeEvaluate(expr);
        assert.equal(res.success, false, `Expected expr '${expr}' to fail safely`);
        assert.equal(res.result, null);
        assert.ok(res.error, `Expected error message for '${expr}'`);
      });
    }
  });

  it('calculates split breakdown with exact integer paise distribution', () => {
    const split = calculateSplitBreakdown(100, 3);
    assert.equal(split.totalPaise, 10000);
    assert.equal(split.remainderPaise, 1);
    assert.deepEqual(split.perPersonRupees, ['33.34', '33.33', '33.33']);
  });
});
