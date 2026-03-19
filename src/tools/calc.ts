import { createTool, Schema } from "chatoyant";

class CalcError extends Error {
  hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

// --- Tokenizer ---

type TokenKind = "num" | "id" | "+" | "-" | "*" | "/" | "%" | "**" | "(" | ")" | "," | "eof";

interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    if (
      (ch >= "0" && ch <= "9") ||
      (ch === "." && i + 1 < src.length && src[i + 1] >= "0" && src[i + 1] <= "9")
    ) {
      const start = i;
      while (i < src.length && src[i] >= "0" && src[i] <= "9") i++;
      if (i < src.length && src[i] === ".") {
        i++;
        while (i < src.length && src[i] >= "0" && src[i] <= "9") i++;
      }
      if (i < src.length && (src[i] === "e" || src[i] === "E")) {
        i++;
        if (i < src.length && (src[i] === "+" || src[i] === "-")) i++;
        const expStart = i;
        while (i < src.length && src[i] >= "0" && src[i] <= "9") i++;
        if (i === expStart) {
          throw new CalcError(
            `Invalid scientific notation at position ${start + 1}`,
            "Use format like '1.5e3' or '2.1E-4'.",
          );
        }
      }
      tokens.push({ kind: "num", value: src.slice(start, i), pos: start });
      continue;
    }

    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      const start = i;
      while (
        i < src.length &&
        ((src[i] >= "a" && src[i] <= "z") ||
          (src[i] >= "A" && src[i] <= "Z") ||
          (src[i] >= "0" && src[i] <= "9") ||
          src[i] === "_")
      )
        i++;
      tokens.push({ kind: "id", value: src.slice(start, i), pos: start });
      continue;
    }

    const pos = i;
    switch (ch) {
      case "+":
        tokens.push({ kind: "+", value: "+", pos });
        i++;
        break;
      case "-":
        tokens.push({ kind: "-", value: "-", pos });
        i++;
        break;
      case "*":
        if (src[i + 1] === "*") {
          tokens.push({ kind: "**", value: "**", pos });
          i += 2;
        } else {
          tokens.push({ kind: "*", value: "*", pos });
          i++;
        }
        break;
      case "/":
        tokens.push({ kind: "/", value: "/", pos });
        i++;
        break;
      case "%":
        tokens.push({ kind: "%", value: "%", pos });
        i++;
        break;
      case "(":
        tokens.push({ kind: "(", value: "(", pos });
        i++;
        break;
      case ")":
        tokens.push({ kind: ")", value: ")", pos });
        i++;
        break;
      case ",":
        tokens.push({ kind: ",", value: ",", pos });
        i++;
        break;
      default:
        throw new CalcError(
          `Unexpected character '${ch}' at position ${pos + 1}`,
          "Only numbers, operators (+, -, *, /, %, **), parentheses, commas, " +
            "and function/constant names are allowed.",
        );
    }
  }

  tokens.push({ kind: "eof", value: "", pos: src.length });
  return tokens;
}

// --- Constants & Functions ---

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  inf: Number.POSITIVE_INFINITY,
  infinity: Number.POSITIVE_INFINITY,
};

const FUNCS: Record<string, { fn: (...a: number[]) => number; arity: string }> = {
  sqrt: {
    arity: "1",
    fn: (x) => {
      if (x < 0)
        throw new CalcError(
          "Cannot take square root of a negative number",
          "Use abs() first if you need the root of the magnitude.",
        );
      return Math.sqrt(x);
    },
  },
  cbrt: { arity: "1", fn: Math.cbrt },
  abs: { arity: "1", fn: Math.abs },
  round: {
    arity: "1-2",
    fn: (...a) => {
      const [x, d] = a;
      if (d === undefined) return Math.round(x);
      const f = 10 ** d;
      return Math.round(x * f) / f;
    },
  },
  floor: { arity: "1", fn: Math.floor },
  ceil: { arity: "1", fn: Math.ceil },
  trunc: { arity: "1", fn: Math.trunc },
  sign: { arity: "1", fn: Math.sign },
  min: { arity: "2+", fn: (...a) => Math.min(...a) },
  max: { arity: "2+", fn: (...a) => Math.max(...a) },
  pow: { arity: "2", fn: Math.pow },
  log: {
    arity: "1",
    fn: (x) => {
      if (x <= 0)
        throw new CalcError(
          "log requires a positive number",
          `Got ${x}. Logarithm is only defined for x > 0.`,
        );
      return Math.log10(x);
    },
  },
  log2: {
    arity: "1",
    fn: (x) => {
      if (x <= 0)
        throw new CalcError(
          "log2 requires a positive number",
          `Got ${x}. Logarithm is only defined for x > 0.`,
        );
      return Math.log2(x);
    },
  },
  ln: {
    arity: "1",
    fn: (x) => {
      if (x <= 0)
        throw new CalcError(
          "ln requires a positive number",
          `Got ${x}. Natural log is only defined for x > 0.`,
        );
      return Math.log(x);
    },
  },
  sin: { arity: "1", fn: Math.sin },
  cos: { arity: "1", fn: Math.cos },
  tan: { arity: "1", fn: Math.tan },
  asin: {
    arity: "1",
    fn: (x) => {
      if (x < -1 || x > 1)
        throw new CalcError("asin out of range", `Got ${x}. asin accepts values in [-1, 1].`);
      return Math.asin(x);
    },
  },
  acos: {
    arity: "1",
    fn: (x) => {
      if (x < -1 || x > 1)
        throw new CalcError("acos out of range", `Got ${x}. acos accepts values in [-1, 1].`);
      return Math.acos(x);
    },
  },
  atan: { arity: "1", fn: Math.atan },
  atan2: { arity: "2", fn: Math.atan2 },
  hypot: { arity: "2+", fn: (...a) => Math.hypot(...a) },
  clamp: {
    arity: "3",
    fn: (v, lo, hi) => {
      if (lo > hi)
        throw new CalcError(
          "clamp: min > max",
          `min=${lo}, max=${hi}. The lower bound must be ≤ the upper bound.`,
        );
      return Math.max(lo, Math.min(hi, v));
    },
  },
  factorial: {
    arity: "1",
    fn: (n) => {
      if (n < 0 || !Number.isInteger(n))
        throw new CalcError(
          "factorial requires a non-negative integer",
          `Got ${n}. Only whole numbers ≥ 0 are valid.`,
        );
      if (n > 170)
        throw new CalcError(
          "factorial overflow (n > 170)",
          "170! is the largest factorial that fits in a 64-bit float.",
        );
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    },
  },
  random: {
    arity: "2",
    fn: (lo, hi) => {
      lo = Math.ceil(lo);
      hi = Math.floor(hi);
      if (lo > hi) throw new CalcError("random: min > max", `min=${lo}, max=${hi}. Swap them.`);
      return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    },
  },
};

function suggestFunction(name: string): string {
  const all = Object.keys(FUNCS);
  const prefix = name.slice(0, 2);
  const hits = all.filter(
    (k) => k.startsWith(prefix) || name.startsWith(k.slice(0, 2)) || k.includes(name),
  );
  if (hits.length > 0 && hits.length <= 5) return `Did you mean: ${hits.join(", ")}?`;
  return `Available functions: ${all.join(", ")}.`;
}

function checkArity(name: string, got: number, spec: string): void {
  if (spec.endsWith("+")) {
    const min = Number(spec.slice(0, -1));
    if (got < min)
      throw new CalcError(
        `${name}() needs at least ${min} argument${min === 1 ? "" : "s"}, got ${got}`,
        `Example: ${name}(${Array.from({ length: min }, (_, i) => String.fromCharCode(97 + i)).join(", ")})`,
      );
  } else if (spec.includes("-")) {
    const [lo, hi] = spec.split("-").map(Number);
    if (got < lo || got > hi)
      throw new CalcError(
        `${name}() takes ${lo}–${hi} arguments, got ${got}`,
        `Example: ${name}(${Array.from({ length: lo }, (_, i) => String.fromCharCode(97 + i)).join(", ")})`,
      );
  } else {
    const n = Number(spec);
    if (got !== n)
      throw new CalcError(
        `${name}() takes exactly ${n} argument${n === 1 ? "" : "s"}, got ${got}`,
        `Example: ${name}(${Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i)).join(", ")})`,
      );
  }
}

// --- Recursive Descent Parser ---
//
//   expression     = additive
//   additive       = multiplicative (('+' | '-') multiplicative)*
//   multiplicative = unary (('*' | '/' | '%') unary)*
//   unary          = ('-' | '+') unary | exponent
//   exponent       = call ('**' exponent)?         [right-associative]
//   call           = IDENT '(' args ')' | primary
//   primary        = NUMBER | CONST | '(' expression ')'
//
// Unary minus binds looser than **, so -2**2 = -(2**2) = -4 (math convention).

export function evaluate(src: string): number {
  if (!src.trim())
    throw new CalcError(
      "Empty expression",
      "Provide a math expression like '2 + 3' or 'sqrt(16)'.",
    );

  const tokens = tokenize(src.trim());
  let pos = 0;

  const peek = (): Token => tokens[pos];
  const advance = (): Token => tokens[pos++];
  const expect = (kind: TokenKind): Token => {
    if (peek().kind !== kind) {
      if (kind === ")")
        throw new CalcError(
          `Missing closing ')' at position ${peek().pos + 1}`,
          "Every '(' needs a matching ')'.",
        );
      throw new CalcError(
        `Expected ${kind} but found '${peek().value}' at position ${peek().pos + 1}`,
        "Check expression syntax.",
      );
    }
    return advance();
  };

  function parseExpr(): number {
    return parseAdditive();
  }

  function parseAdditive(): number {
    let left = parseMultiplicative();
    while (peek().kind === "+" || peek().kind === "-") {
      const op = advance().kind;
      const right = parseMultiplicative();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseMultiplicative(): number {
    let left = parseUnary();
    while (peek().kind === "*" || peek().kind === "/" || peek().kind === "%") {
      const op = advance();
      const right = parseUnary();
      if (op.kind === "*") left *= right;
      else if (op.kind === "/") {
        if (right === 0) throw new CalcError("Division by zero", "The divisor evaluates to 0.");
        left /= right;
      } else {
        if (right === 0) throw new CalcError("Modulo by zero", "The divisor evaluates to 0.");
        left %= right;
      }
    }
    return left;
  }

  function parseUnary(): number {
    if (peek().kind === "-") {
      advance();
      return -parseUnary();
    }
    if (peek().kind === "+") {
      advance();
      return parseUnary();
    }
    return parseExponent();
  }

  function parseExponent(): number {
    const base = parseCall();
    if (peek().kind === "**") {
      advance();
      return base ** parseExponent();
    }
    return base;
  }

  function parseCall(): number {
    if (peek().kind === "id") {
      const name = peek().value.toLowerCase();

      // Constant without parens
      if (name in CONSTANTS && tokens[pos + 1]?.kind !== "(") {
        advance();
        return CONSTANTS[name];
      }

      // Function call
      if (tokens[pos + 1]?.kind === "(") {
        if (name in CONSTANTS && !(name in FUNCS)) {
          throw new CalcError(
            `'${name}' is a constant, not a function`,
            `Use it without parentheses: ${name} (= ${CONSTANTS[name]}).`,
          );
        }
        if (!(name in FUNCS)) {
          throw new CalcError(`Unknown function '${name}'`, suggestFunction(name));
        }
        advance(); // ident
        advance(); // (
        const args: number[] = [];
        if (peek().kind !== ")") {
          args.push(parseExpr());
          while (peek().kind === ",") {
            advance();
            args.push(parseExpr());
          }
        }
        expect(")");
        checkArity(name, args.length, FUNCS[name].arity);
        return FUNCS[name].fn(...args);
      }

      // Bare identifier — not a known constant, not followed by (
      if (name in FUNCS) {
        throw new CalcError(
          `'${name}' is a function — call it with parentheses`,
          `Example: ${name}(${FUNCS[name].arity === "1" ? "x" : "x, y"})`,
        );
      }

      throw new CalcError(
        `Unknown name '${name}' at position ${peek().pos + 1}`,
        `Constants: ${Object.keys(CONSTANTS).join(", ")}. ${suggestFunction(name)}`,
      );
    }

    return parsePrimary();
  }

  function parsePrimary(): number {
    if (peek().kind === "num") return Number(advance().value);

    if (peek().kind === "(") {
      advance();
      const val = parseExpr();
      expect(")");
      return val;
    }

    if (peek().kind === "eof") {
      throw new CalcError(
        "Unexpected end of expression",
        "The expression looks incomplete — missing a number or closing parenthesis?",
      );
    }

    throw new CalcError(
      `Unexpected '${peek().value}' at position ${peek().pos + 1}`,
      "Expected a number, constant (pi, e, tau), function call, or '('.",
    );
  }

  const result = parseExpr();

  if (peek().kind !== "eof") {
    throw new CalcError(
      `Unexpected '${peek().value}' at position ${peek().pos + 1} after complete expression`,
      "Extra content — missing an operator between terms?",
    );
  }

  if (Number.isNaN(result))
    throw new CalcError(
      "Result is NaN (not a number)",
      "The expression produced an undefined mathematical result.",
    );

  return parseFloat(result.toPrecision(15));
}

// --- Tool ---

class CalcParams extends Schema {
  expression = Schema.String({
    description:
      "A math expression. Supports: numbers, +, -, *, /, % (modulo), ** (power), " +
      "parentheses, constants (pi, e, tau), and functions (sqrt, abs, round, floor, ceil, " +
      "min, max, pow, log, log2, ln, sin, cos, tan, asin, acos, atan, cbrt, trunc, sign, " +
      "clamp, hypot, factorial, random). " +
      "Examples: '(15.7 * 3.2) + (8.9 / 2.1)', 'round(pi * 100, 2)', 'factorial(10)'.",
  });
}

export function createCalcTool() {
  return createTool({
    name: "calc",
    description:
      "Safe math evaluator — use this instead of computing arithmetic in your head. " +
      "Handles basic arithmetic, exponents, roots, trigonometry, rounding, factorials, " +
      "min/max, and more. Pass a mathematical expression string and get the exact numeric " +
      "result. Returns { expression, result } on success or { error, hint } on failure.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new CalcParams() as any,
    execute: async ({ args }) => {
      const { expression } = args as { expression: string };
      try {
        const result = evaluate(expression);
        return { expression, result };
      } catch (err) {
        if (err instanceof CalcError) return { error: err.message, hint: err.hint };
        return { error: "Evaluation failed", hint: String(err) };
      }
    },
  });
}
