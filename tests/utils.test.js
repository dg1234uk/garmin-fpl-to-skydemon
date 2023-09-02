import { expect, test } from "vitest";
import { toDecimalDegrees } from "../utils/utils";

// Test DMS with decimal seconds format
test("DMSs format", () => {
  const result = toDecimalDegrees("412412.2N");
  expect(result).toBeCloseTo(41.403389);
});

// Test DM with decimal minutes format
test("DMm format", () => {
  const result = toDecimalDegrees("4124.202N");
  expect(result).toBeCloseTo(41.403367);
});

// Test Pure decimal format
test("Dd format", () => {
  const result = toDecimalDegrees("41.4034N");
  expect(result).toBe(41.4034);
});

// Test Standard DMS without any decimal format
test("DMS format", () => {
  const result = toDecimalDegrees("412412N");
  expect(result).toBeCloseTo(41.4033333333);
});

// Test negative values for South coordinates
test("Negative values for South", () => {
  const result = toDecimalDegrees("412412.2S");
  expect(result).toBeCloseTo(-41.40338889);
});

// Test negative values for West coordinates
test("Negative values for West", () => {
  const result = toDecimalDegrees("412412.2W");
  expect(result).toBeCloseTo(-41.40338889);
});

// Test invalid coordinate format
test("Invalid format", () => {
  const result = toDecimalDegrees("41241.202N");
  expect(result).toBe(null);
});

// Test null for empty string
test("Empty string", () => {
  const result = toDecimalDegrees("");
  expect(result).toBe(null);
});

// Test that other letters besides N, S, E, and W result in null
test("Invalid direction", () => {
  const result = toDecimalDegrees("4124.202P");
  expect(result).toBe(null);
});
