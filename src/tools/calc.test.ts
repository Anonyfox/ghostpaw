import { ok, strictEqual, throws } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createCalcTool, evaluate } from "./calc.ts";

type ToolResult = Record<string, unknown>;

let execute: (args: Record<string, unknown>) => Promise<ToolResult>;

beforeEach(() => {
  const tool = createCalcTool();
  execute = (args) =>
    tool.execute({ args, ctx: { model: "test", provider: "test" } }) as Promise<ToolResult>;
});

describe("calc tool", () => {
  it("has correct metadata", () => {
    const tool = createCalcTool();
    strictEqual(tool.name, "calc");
    ok(tool.description.includes("math"));
  });

  it("returns result through tool interface", async () => {
    const r = await execute({ expression: "2 + 3" });
    strictEqual(r.expression, "2 + 3");
    strictEqual(r.result, 5);
  });

  it("returns error with hint through tool interface", async () => {
    const r = await execute({ expression: "1 / 0" });
    ok(typeof r.error === "string");
    ok(typeof r.hint === "string");
  });
});

describe("evaluate — basic arithmetic", () => {
  it("adds integers", () => strictEqual(evaluate("2 + 3"), 5));
  it("subtracts", () => strictEqual(evaluate("10 - 4"), 6));
  it("multiplies", () => strictEqual(evaluate("3 * 7"), 21));
  it("divides", () => strictEqual(evaluate("20 / 4"), 5));
  it("modulo", () => strictEqual(evaluate("17 % 5"), 2));
  it("decimal addition", () => strictEqual(evaluate("1.5 + 2.3"), 3.8));
  it("decimal multiply", () => strictEqual(evaluate("1.5 * 2"), 3));
  it("cleans floating point artifacts", () => strictEqual(evaluate("0.1 + 0.2"), 0.3));
});

describe("evaluate — operator precedence", () => {
  it("mul before add", () => strictEqual(evaluate("2 + 3 * 4"), 14));
  it("parens override", () => strictEqual(evaluate("(2 + 3) * 4"), 20));
  it("complex precedence", () => strictEqual(evaluate("2 * 3 + 4 * 5"), 26));
  it("nested parens", () => strictEqual(evaluate("((2 + 3) * (4 - 1))"), 15));
  it("div before sub", () => strictEqual(evaluate("10 - 6 / 3"), 8));
});

describe("evaluate — unary operators", () => {
  it("negative number", () => strictEqual(evaluate("-5"), -5));
  it("double negative", () => strictEqual(evaluate("--5"), 5));
  it("unary plus", () => strictEqual(evaluate("+5"), 5));
  it("negative in expression", () => strictEqual(evaluate("3 + -2"), 1));
  it("negated group", () => strictEqual(evaluate("-(3 + 2)"), -5));
});

describe("evaluate — exponentiation", () => {
  it("basic power", () => strictEqual(evaluate("2 ** 10"), 1024));
  it("right-associative", () => strictEqual(evaluate("2 ** 3 ** 2"), 512));
  it("negative base in parens", () => strictEqual(evaluate("(-2) ** 2"), 4));
  it("unary minus lower precedence than **", () => strictEqual(evaluate("-2 ** 2"), -4));
  it("fractional exponent", () => strictEqual(evaluate("27 ** (1/3)"), 3));
});

describe("evaluate — scientific notation", () => {
  it("1.5e3", () => strictEqual(evaluate("1.5e3"), 1500));
  it("2E-4", () => strictEqual(evaluate("2E-4"), 0.0002));
  it("arithmetic with sci notation", () => strictEqual(evaluate("1e3 + 500"), 1500));
});

describe("evaluate — constants", () => {
  it("pi", () => strictEqual(evaluate("pi"), parseFloat(Math.PI.toPrecision(15))));
  it("e", () => strictEqual(evaluate("e"), parseFloat(Math.E.toPrecision(15))));
  it("tau = 2*pi", () => strictEqual(evaluate("tau"), parseFloat((Math.PI * 2).toPrecision(15))));
  it("pi in expression", () =>
    strictEqual(evaluate("2 * pi"), parseFloat((2 * Math.PI).toPrecision(15))));
});

describe("evaluate — functions", () => {
  it("sqrt", () => strictEqual(evaluate("sqrt(16)"), 4));
  it("sqrt(2)", () => strictEqual(evaluate("sqrt(2)"), parseFloat(Math.sqrt(2).toPrecision(15))));
  it("cbrt", () => strictEqual(evaluate("cbrt(27)"), 3));
  it("abs positive", () => strictEqual(evaluate("abs(42)"), 42));
  it("abs negative", () => strictEqual(evaluate("abs(-42)"), 42));
  it("round", () => strictEqual(evaluate("round(3.7)"), 4));
  it("round with decimals", () => strictEqual(evaluate("round(pi, 2)"), 3.14));
  it("round to negative places", () => strictEqual(evaluate("round(1234, -2)"), 1200));
  it("floor", () => strictEqual(evaluate("floor(3.9)"), 3));
  it("ceil", () => strictEqual(evaluate("ceil(3.1)"), 4));
  it("trunc", () => strictEqual(evaluate("trunc(3.9)"), 3));
  it("trunc negative", () => strictEqual(evaluate("trunc(-3.9)"), -3));
  it("sign", () => strictEqual(evaluate("sign(-42)"), -1));
  it("min", () => strictEqual(evaluate("min(5, 3, 8, 1)"), 1));
  it("max", () => strictEqual(evaluate("max(5, 3, 8, 1)"), 8));
  it("pow", () => strictEqual(evaluate("pow(2, 8)"), 256));
  it("log base 10", () => strictEqual(evaluate("log(1000)"), 3));
  it("log2", () => strictEqual(evaluate("log2(256)"), 8));
  it("ln(e) = 1", () => strictEqual(evaluate("ln(e)"), 1));
  it("sin(0) = 0", () => strictEqual(evaluate("sin(0)"), 0));
  it("cos(0) = 1", () => strictEqual(evaluate("cos(0)"), 1));
  it("factorial(0) = 1", () => strictEqual(evaluate("factorial(0)"), 1));
  it("factorial(10)", () => strictEqual(evaluate("factorial(10)"), 3628800));
  it("hypot", () => strictEqual(evaluate("hypot(3, 4)"), 5));
  it("clamp below", () => strictEqual(evaluate("clamp(-5, 0, 10)"), 0));
  it("clamp above", () => strictEqual(evaluate("clamp(15, 0, 10)"), 10));
  it("clamp within", () => strictEqual(evaluate("clamp(5, 0, 10)"), 5));
  it("nested functions", () => strictEqual(evaluate("sqrt(abs(-16))"), 4));
  it("function in expression", () => strictEqual(evaluate("sqrt(9) + pow(2, 3)"), 11));
});

describe("evaluate — random", () => {
  it("returns integer in range", () => {
    for (let i = 0; i < 20; i++) {
      const r = evaluate("random(1, 10)");
      ok(Number.isInteger(r), `expected integer, got ${r}`);
      ok(r >= 1 && r <= 10, `expected 1..10, got ${r}`);
    }
  });
});

describe("evaluate — complex expressions", () => {
  it("compound arithmetic", () => {
    const result = evaluate("(15.7 * 3.2) + (8.9 / 2.1)");
    const expected = parseFloat((15.7 * 3.2 + 8.9 / 2.1).toPrecision(15));
    strictEqual(result, expected);
  });

  it("pythagorean theorem", () => {
    strictEqual(evaluate("sqrt(pow(3, 2) + pow(4, 2))"), 5);
  });

  it("compound interest", () => {
    const result = evaluate("1000 * pow(1 + 0.05, 10)");
    const expected = parseFloat((1000 * 1.05 ** 10).toPrecision(15));
    strictEqual(result, expected);
  });

  it("deeply nested", () => {
    strictEqual(evaluate("abs(min(-3, -7, -1))"), 7);
  });
});

describe("evaluate — errors", () => {
  it("division by zero", () => throws(() => evaluate("1 / 0"), /Division by zero/));
  it("modulo by zero", () => throws(() => evaluate("7 % 0"), /Modulo by zero/));
  it("empty expression", () => throws(() => evaluate(""), /Empty expression/));
  it("whitespace only", () => throws(() => evaluate("   "), /Empty expression/));
  it("missing closing paren", () => throws(() => evaluate("(2 + 3"), /Missing.*\)/));
  it("sqrt of negative", () => throws(() => evaluate("sqrt(-1)"), /negative/));
  it("log of zero", () => throws(() => evaluate("log(0)"), /positive/));
  it("log of negative", () => throws(() => evaluate("ln(-5)"), /positive/));
  it("asin out of range", () => throws(() => evaluate("asin(2)"), /out of range/));
  it("acos out of range", () => throws(() => evaluate("acos(-1.5)"), /out of range/));
  it("factorial of negative", () => throws(() => evaluate("factorial(-1)"), /non-negative/));
  it("factorial overflow", () => throws(() => evaluate("factorial(171)"), /overflow/));
  it("factorial of float", () => throws(() => evaluate("factorial(3.5)"), /non-negative integer/));
  it("unknown function", () => throws(() => evaluate("power(2, 3)"), /Unknown function/));
  it("unexpected character", () => throws(() => evaluate("2 @ 3"), /Unexpected character/));
  it("trailing content", () => throws(() => evaluate("2 3"), /Unexpected.*after/));
  it("function without parens", () => throws(() => evaluate("sqrt"), /function.*parentheses/));
  it("constant as function", () => throws(() => evaluate("e(5)"), /constant.*not a function/));
  it("unknown name", () => throws(() => evaluate("foo"), /Unknown name/));
  it("clamp min > max", () => throws(() => evaluate("clamp(5, 10, 0)"), /min > max/));
  it("random min > max", () => throws(() => evaluate("random(10, 1)"), /min > max/));
  it("wrong arity", () => throws(() => evaluate("sqrt(1, 2)"), /exactly 1/));
  it("too few args", () => throws(() => evaluate("min(5)"), /at least 2/));
  it("bad sci notation", () => throws(() => evaluate("1.5e"), /scientific notation/));
});
