import { expect, test } from "vitest";
import { stringToDecimalDegrees } from "../utils/stringToDecimalDegrees";

test("DDMMSS.s with no separtors and N cardinal direction", () => {
  const result = stringToDecimalDegrees("412412.2N");
  expect(result).toBeCloseTo(41.40338889);
});

test("DDMM.m format with no separtors and N cardinal direction", () => {
  const result = stringToDecimalDegrees("4124.202N");
  expect(result).toBeCloseTo(41.40336667);
});

test("DD.d with no separtors and N cardinal direction", () => {
  const result = stringToDecimalDegrees("41.4034N");
  expect(result).toBeCloseTo(41.4034);
});

test("DDMMSS with no separtors and N cardinal direction", () => {
  const result = stringToDecimalDegrees("412412N");
  expect(result).toBeCloseTo(41.40333333);
});

test("DDMMSS.s with no separtors and S cardinal direction", () => {
  const result = stringToDecimalDegrees("412412.2S");
  expect(result).toBeCloseTo(-41.40338889);
});

test("DDMMSS.s with no separtors and W cardinal direction", () => {
  const result = stringToDecimalDegrees("412412.2W");
  expect(result).toBeCloseTo(-41.40338889);
});

test("DDDMMSS.s with no separtors and W cardinal direction", () => {
  const result = stringToDecimalDegrees("1763424.55W");
  expect(result).toBeCloseTo(-176.5734861);
});

test("Spacing in DDMMSS.s", () => {
  const result = stringToDecimalDegrees("53 14 44.943N");
  expect(result).toBeCloseTo(53.2458175);
});

test("Special symbols in DDMMSS.s", () => {
  const result = stringToDecimalDegrees(`53°14'44.943"N`);
  expect(result).toBeCloseTo(53.2458175);
});

test("Spacing and symbols in DDMMSS.s", () => {
  const result = stringToDecimalDegrees(`53° 14' 44.943" N`);
  expect(result).toBeCloseTo(53.2458175);
});

test("Invalid format with cardinal direction", () => {
  const result = stringToDecimalDegrees("41241.202N");
  expect(result).toBe(null);
});

test("Invalid format without cardinal direction", () => {
  const result = stringToDecimalDegrees("41241.202");
  expect(result).toBe(null);
});

test("Invalid direction", () => {
  const result = stringToDecimalDegrees("4124.202P");
  expect(result).toBe(null);
});

test("Empty string", () => {
  const result = stringToDecimalDegrees("");
  expect(result).toBe(null);
});

test("Max valid longitude", () => {
  const result = stringToDecimalDegrees("180E");
  expect(result).toBeCloseTo(180);
});

test("Max valid latitude", () => {
  const result = stringToDecimalDegrees("90N");
  expect(result).toBeCloseTo(90);
});

test("Zero longitude", () => {
  const result = stringToDecimalDegrees("0W");
  expect(result).toBeCloseTo(0);
});

test("Zero latitude", () => {
  const result = stringToDecimalDegrees("0N");
  expect(result).toBeCloseTo(0);
});

test("South using minus", () => {
  const result = stringToDecimalDegrees("-90");
  expect(result).toBeCloseTo(-90);
});

test("West using minus", () => {
  const result = stringToDecimalDegrees("-180");
  expect(result).toBeCloseTo(-180);
});

test("North", () => {
  const result = stringToDecimalDegrees("90");
  expect(result).toBeCloseTo(90);
});

test("East", () => {
  const result = stringToDecimalDegrees("180");
  expect(result).toBeCloseTo(180);
});

test("DDMMSS.s format with different spacing 1", () => {
  const result = stringToDecimalDegrees("53 14 44.943 N");
  expect(result).toBeCloseTo(53.2458175);
});

test("DDMM.m format with different spacing 2", () => {
  const result = stringToDecimalDegrees("53 14.943N");
  expect(result).toBeCloseTo(53.24905);
});

test("Using different symbols for DDMMSS.s", () => {
  const result = stringToDecimalDegrees("53°14’44.943”N");
  expect(result).toBeCloseTo(53.2458175);
});

test("Longitude greater than 180", () => {
  const result = stringToDecimalDegrees("191°14'44.943\"E");
  expect(result).toBe(null);
});

test("Latitude greater than 90", () => {
  const result = stringToDecimalDegrees("93°14'44.943\"N");
  expect(result).toBe(null);
});

test("Minutes greater than 59", () => {
  const result = stringToDecimalDegrees("53°61'44.943\"N");
  expect(result).toBe(null);
});

test("Seconds greater than 59", () => {
  const result = stringToDecimalDegrees("53°14'65.943\"N");
  expect(result).toBe(null);
});

test("Invalid symbol", () => {
  const result = stringToDecimalDegrees("4124.202$");
  expect(result).toBe(null);
});

test("Invalid direction", () => {
  const result = stringToDecimalDegrees("53°14'44.943\"Z");
  expect(result).toBe(null);
});

test("Just a space", () => {
  const result = stringToDecimalDegrees(" ");
  expect(result).toBe(null);
});

test("Only direction", () => {
  const result = stringToDecimalDegrees("N");
  expect(result).toBe(null);
});

test("Missing seconds in DMS format", () => {
  const result = stringToDecimalDegrees("53°14'");
  expect(result).toBeCloseTo(53.23333333);
});
