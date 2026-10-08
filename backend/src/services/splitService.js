/**
 * splitService.js
 * Responsible for calculating and validating expense splits in integer paise.
 * All math is deterministic and server-enforced.
 */

export class SplitValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'SplitValidationError';
    this.status = 400;
    this.details = details;
  }
}

/**
 * Calculate equal splits for a totalAmount among an array of personIds.
 * Remainder is distributed 1 paise at a time in deterministic order (by sorted personId).
 * 
 * @param {number} totalAmount - Total amount in paise (must be positive integer)
 * @param {string[]} personIds - Array of person UUIDs
 * @returns {Array<{ personId: string, amount: number }>}
 */
export function calculateEqualSplits(totalAmount, personIds) {
  if (!Array.isArray(personIds) || personIds.length === 0) {
    throw new SplitValidationError('At least one person is required for equal split');
  }

  // Remove duplicates and sort deterministically
  const uniquePersons = [...new Set(personIds)].sort();
  const count = uniquePersons.length;

  const baseAmount = Math.floor(totalAmount / count);
  let remainder = totalAmount % count;

  return uniquePersons.map((personId) => {
    let amount = baseAmount;
    if (remainder > 0) {
      amount += 1;
      remainder -= 1;
    }
    return {
      personId,
      amount,
    };
  });
}

/**
 * Validate and calculate exact splits.
 * 
 * @param {number} totalAmount - Total amount in paise
 * @param {Array<{ personId: string, exactAmount: number }>} splitsInput
 * @returns {Array<{ personId: string, amount: number, exactAmount: number }>}
 */
export function calculateExactSplits(totalAmount, splitsInput) {
  if (!Array.isArray(splitsInput) || splitsInput.length === 0) {
    throw new SplitValidationError('At least one person split is required');
  }

  const seen = new Set();
  let runningSum = 0;

  const splits = splitsInput.map((s) => {
    if (seen.has(s.personId)) {
      throw new SplitValidationError(`Duplicate person in splits: ${s.personId}`);
    }
    seen.add(s.personId);

    const amount = Number(s.amount ?? s.exactAmount);
    if (!Number.isInteger(amount) || amount < 0) {
      throw new SplitValidationError(`Split amount for person ${s.personId} must be a non-negative integer paise`);
    }

    runningSum += amount;
    return {
      personId: s.personId,
      amount,
      exactAmount: amount,
    };
  });

  if (runningSum !== totalAmount) {
    throw new SplitValidationError(
      `Sum of exact splits (${runningSum} paise) does not equal total amount (${totalAmount} paise)`
    );
  }

  return splits;
}

/**
 * Calculate percentage splits using basis points and largest-remainder method (Hare-Niemeyer).
 * Basis points must sum to 10000 (100.00%).
 * 
 * @param {number} totalAmount - Total amount in paise
 * @param {Array<{ personId: string, basisPoints: number }>} splitsInput
 * @returns {Array<{ personId: string, amount: number, basisPoints: number }>}
 */
export function calculatePercentageSplits(totalAmount, splitsInput) {
  if (!Array.isArray(splitsInput) || splitsInput.length === 0) {
    throw new SplitValidationError('At least one person split is required');
  }

  const seen = new Set();
  let totalBps = 0;

  for (const s of splitsInput) {
    if (seen.has(s.personId)) {
      throw new SplitValidationError(`Duplicate person in splits: ${s.personId}`);
    }
    seen.add(s.personId);

    const bps = Number(s.basisPoints);
    if (!Number.isInteger(bps) || bps < 0 || bps > 10000) {
      throw new SplitValidationError(`Basis points for person ${s.personId} must be an integer between 0 and 10000`);
    }
    totalBps += bps;
  }

  if (totalBps !== 10000) {
    throw new SplitValidationError(
      `Sum of percentage splits must equal 100% (10000 basis points). Received: ${totalBps} bps`
    );
  }

  // Largest-remainder distribution
  let distributedPaise = 0;
  const items = splitsInput.map((s) => {
    const bps = Number(s.basisPoints);
    const exactPaise = (totalAmount * bps) / 10000;
    const basePaise = Math.floor(exactPaise);
    const fraction = exactPaise - basePaise;
    distributedPaise += basePaise;

    return {
      personId: s.personId,
      basisPoints: bps,
      amount: basePaise,
      fraction,
    };
  });

  let remainderPaise = totalAmount - distributedPaise;

  // Sort descending by fraction, tie-breaking deterministically by personId
  items.sort((a, b) => {
    if (b.fraction !== a.fraction) {
      return b.fraction - a.fraction;
    }
    return a.personId.localeCompare(b.personId);
  });

  // Distribute remaining paise to largest fractions
  for (let i = 0; i < remainderPaise; i++) {
    items[i].amount += 1;
  }

  // Return clean list
  return items.map(({ personId, amount, basisPoints }) => ({
    personId,
    amount,
    basisPoints,
  }));
}

/**
 * Universal split processor
 */
export function processSplits(splitType, totalAmount, splitsInput, selectedPersonIds = []) {
  if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
    throw new SplitValidationError('Total amount must be a positive integer in paise');
  }

  switch (splitType) {
    case 'equal':
      return calculateEqualSplits(totalAmount, selectedPersonIds.length > 0 ? selectedPersonIds : splitsInput.map((s) => s.personId));
    case 'exact':
      return calculateExactSplits(totalAmount, splitsInput);
    case 'percentage':
      return calculatePercentageSplits(totalAmount, splitsInput);
    default:
      throw new SplitValidationError(`Unsupported split type: ${splitType}`);
  }
}
