/**
 * Safe expression parser and evaluator using the Shunting-Yard algorithm.
 * Absolutely NO eval() or Function() used.
 */

export class MathParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MathParseError';
  }
}

/**
 * Tokenizes a mathematical expression string.
 */
function tokenize(expr) {
  const clean = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  const tokens = [];
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];

    // Numbers (including decimals)
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      let hasDot = false;
      while (i < clean.length && /[0-9.]/.test(clean[i])) {
        if (clean[i] === '.') {
          if (hasDot) throw new MathParseError('Invalid decimal format: multiple decimal points');
          hasDot = true;
        }
        numStr += clean[i];
        i++;
      }
      if (numStr === '.') {
        throw new MathParseError('Invalid decimal format: isolated decimal point');
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    // Percentage key (%) - treated as postfix unary percent operator
    if (char === '%') {
      const prev = tokens[tokens.length - 1];
      if (!prev || (prev.type !== 'NUMBER' && !(prev.type === 'PAREN' && prev.value === ')'))) {
        throw new MathParseError("Unexpected '%' operator without preceding number");
      }
      tokens.push({ type: 'PERCENT', value: '%' });
      i++;
      continue;
    }

    // Operators
    if (['+', '-', '*', '/'].includes(char)) {
      const prev = tokens[tokens.length - 1];

      // Check for unary minus / plus
      const isUnary =
        !prev ||
        prev.type === 'OPERATOR' ||
        prev.type === 'UNARY_MINUS' ||
        (prev.type === 'PAREN' && prev.value === '(');

      if (isUnary) {
        if (char === '-') {
          tokens.push({ type: 'UNARY_MINUS', value: 'u-' });
          i++;
          continue;
        }
        throw new MathParseError(`Unexpected operator '${char}'`);
      }

      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'PAREN', value: char });
      i++;
      continue;
    }

    throw new MathParseError(`Unexpected character: '${char}'`);
  }

  return tokens;
}

const PRECEDENCE = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  'u-': 3,
};

/**
 * Converts infix tokens to postfix (Reverse Polish Notation) via Shunting-Yard.
 */
function infixToRPN(tokens) {
  const outputQueue = [];
  const operatorStack = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'NUMBER') {
      outputQueue.push(token);
    } else if (token.type === 'PERCENT') {
      // Postfix unary operator binds immediately to previous operand
      outputQueue.push(token);
    } else if (token.type === 'UNARY_MINUS') {
      operatorStack.push(token);
    } else if (token.type === 'OPERATOR') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].value !== '(' &&
        PRECEDENCE[operatorStack[operatorStack.length - 1].value] >= PRECEDENCE[token.value]
      ) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(token);
    } else if (token.type === 'PAREN' && token.value === '(') {
      operatorStack.push(token);
    } else if (token.type === 'PAREN' && token.value === ')') {
      let foundMatchingParen = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop();
        if (top.value === '(') {
          foundMatchingParen = true;
          break;
        }
        outputQueue.push(top);
      }
      if (!foundMatchingParen) {
        throw new MathParseError('Mismatched parentheses');
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop();
    if (top.value === '(' || top.value === ')') {
      throw new MathParseError('Mismatched parentheses');
    }
    outputQueue.push(top);
  }

  return outputQueue;
}

/**
 * Evaluates an RPN token stream.
 */
function evaluateRPN(rpnTokens) {
  const stack = [];

  for (let i = 0; i < rpnTokens.length; i++) {
    const token = rpnTokens[i];

    if (token.type === 'NUMBER') {
      stack.push(token.value);
    } else if (token.type === 'PERCENT') {
      if (stack.length < 1) throw new MathParseError('Syntax error with percent operand');
      const b = stack.pop();

      // Lookahead in RPN to see if this percent is immediately followed by addition or subtraction
      const nextToken = rpnTokens[i + 1];
      if (nextToken && nextToken.type === 'OPERATOR' && (nextToken.value === '+' || nextToken.value === '-') && stack.length >= 1) {
        // e.g. 100 - 10% -> 10% of 100 = 10, then 100 - 10 = 90
        const base = stack[stack.length - 1];
        stack.push(base * (b / 100));
      } else {
        // Multiplicative or standalone percent: e.g. 200 * 10% = 20, 10% = 0.1
        stack.push(b / 100);
      }
    } else if (token.type === 'UNARY_MINUS') {
      if (stack.length < 1) throw new MathParseError('Syntax error with negative operand');
      const val = stack.pop();
      stack.push(-val);
    } else if (token.type === 'OPERATOR') {
      if (stack.length < 2) throw new MathParseError('Syntax error: missing operands');
      const b = stack.pop();
      const a = stack.pop();

      switch (token.value) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) throw new MathParseError('Cannot divide by zero');
          stack.push(a / b);
          break;
        default:
          throw new MathParseError(`Unknown operator '${token.value}'`);
      }
    }
  }

  if (stack.length !== 1) {
    throw new MathParseError('Invalid mathematical expression');
  }

  const result = stack[0];
  if (!Number.isFinite(result)) {
    throw new MathParseError('Result is not finite');
  }

  // Round to max 6 decimal places to prevent floating point noise (e.g., 0.1 + 0.2 = 0.3)
  return Math.round(result * 1000000) / 1000000;
}

/**
 * Safely evaluates a mathematical expression string.
 * Always returns a structured result state:
 * { success: boolean, result: number | null, error: string | null }
 * Does NOT throw exceptions for malformed input or division by zero.
 */
export function safeEvaluate(expr) {
  if (expr === undefined || expr === null || (typeof expr === 'string' && expr.trim() === '')) {
    return {
      success: true,
      result: 0,
      error: null,
      valueOf() {
        return 0;
      },
      toString() {
        return '0';
      },
    };
  }

  try {
    const tokens = tokenize(String(expr));
    if (tokens.length === 0) {
      return {
        success: true,
        result: 0,
        error: null,
        valueOf() {
          return 0;
        },
        toString() {
          return '0';
        },
      };
    }
    const rpn = infixToRPN(tokens);
    const value = evaluateRPN(rpn);
    return {
      success: true,
      result: value,
      error: null,
      valueOf() {
        return value;
      },
      toString() {
        return String(value);
      },
    };
  } catch (err) {
    const errorMsg =
      err instanceof MathParseError ? err.message : 'Invalid mathematical expression';
    return {
      success: false,
      result: null,
      error: errorMsg,
      valueOf() {
        return NaN;
      },
      toString() {
        return errorMsg;
      },
    };
  }
}

/**
 * Computes split amounts with explicit integer remainder allocation in paise.
 *
 * @param {number|string} totalRupees
 * @param {number|string} numPeople
 * @returns {{ perPersonRupees: string[], remainderPaise: number, totalPaise: number }}
 */
export function calculateSplitBreakdown(totalRupees, numPeople) {
  const people = parseInt(numPeople, 10);
  if (isNaN(people) || people <= 0) {
    throw new MathParseError('Number of people must be at least 1');
  }

  const totalPaise = Math.round((parseFloat(totalRupees) || 0) * 100);
  if (totalPaise <= 0) {
    return { perPersonRupees: Array(people).fill('0.00'), remainderPaise: 0, totalPaise: 0 };
  }

  const basePaise = Math.floor(totalPaise / people);
  const remainderPaise = totalPaise % people;

  const perPerson = [];
  for (let i = 0; i < people; i++) {
    const paise = i < remainderPaise ? basePaise + 1 : basePaise;
    perPerson.push((paise / 100).toFixed(2));
  }

  return {
    perPersonRupees: perPerson,
    remainderPaise,
    totalPaise,
  };
}
