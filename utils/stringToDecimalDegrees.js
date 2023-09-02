function determineDirectionMultiplier(coord) {
  const directionRegex = /^[SW]|([SW])$/i;
  if (directionRegex.test(coord)) return -1;
  if (coord.startsWith("-")) return -1;
  return 1;
}

function extractCoordinateParts(coord) {
  function setDecimal(value) {
    const decimal = Number(`.${value}`);
    return Number.isNaN(decimal) ? 0 : decimal;
  }

  // This function will validate the parts for DMS format
  function isValidDMS(parts, isLatitude) {
    if (!parts || parts.length < 1) return false;

    const [degrees, minutes, seconds] = parts;

    if (isLatitude && (degrees < 0 || degrees > 90)) return false;
    if (!isLatitude && (degrees < 0 || degrees > 180)) return false;
    if (minutes !== undefined && (minutes < 0 || minutes >= 60)) return false;
    if (seconds !== undefined && (seconds < 0 || seconds >= 60)) return false;

    return true;
  }

  // Try pattern matching for D° M' S.s" N format

  const dmsPattern = coord.match(/^(\d+)°\s?(\d+)['’]?\s?(\d+(\.\d+)?)?["”]?/);
  if (dmsPattern) {
    const [degrees, minutes, seconds] = dmsPattern.slice(1, 4).map(Number);
    // if degrees minutes or seconds are undefined, set them to 0
    const parts = [degrees, minutes || 0, seconds || 0];
    if (!isValidDMS(parts, false)) return null;
    return parts;
  }

  if (coord.match(/[^0-9.]/)) {
    const groups = coord.split(/[^0-9.]+/);
    const parts = groups.map(Number);
    if (!isValidDMS(parts, false)) return null;
    return parts;
  }

  const LATITUDE_DMS = {
    length: 6,
    slices: [
      [0, 2],
      [2, 4],
      [4, 6],
    ],
  };
  const LONGITUDE_DMS = {
    length: 7,
    slices: [
      [0, 3],
      [3, 5],
      [5, 7],
    ],
  };
  const LATITUDE_DM = {
    length: 4,
    slices: [
      [0, 2],
      [2, 4],
    ],
  };
  const LONGITUDE_DM = {
    length: 5,
    slices: [
      [0, 3],
      [3, 5],
    ],
  };
  const formats = [LATITUDE_DMS, LONGITUDE_DMS, LATITUDE_DM, LONGITUDE_DM];

  const [integerPart, decimalPart] = coord.split(".");
  const decimal = setDecimal(decimalPart || "");

  const format = formats.find((f) => integerPart.length === f.length);
  if (format) {
    const parts = format.slices.map((slice) =>
      Number(integerPart.slice(...slice))
    );

    if (!isValidDMS(parts, format.length % 2 === 0)) return null;

    if (parts.length === 2) parts[1] += decimal;
    else if (parts.length === 3) parts[2] += decimal;
    return parts;
  }
  return [Number(integerPart) + decimal];
}

function computeDecimalDegrees(parts) {
  const divisors = [1, 60, 3600]; // divisors for degrees, minutes, seconds respectively
  return parts.reduce((acc, part, index) => acc + part / divisors[index], 0);
}

function isValidLatitudeDMS(parts) {
  return (
    parts[0] >= 0 &&
    parts[0] <= 90 &&
    (parts.length < 2 || (parts[1] >= 0 && parts[1] < 60)) &&
    (parts.length < 3 || (parts[2] >= 0 && parts[2] < 60))
  );
}

function isValidLongitudeDMS(parts) {
  return (
    parts[0] >= 0 &&
    parts[0] <= 180 &&
    (parts.length < 2 || (parts[1] >= 0 && parts[1] < 60)) &&
    (parts.length < 3 || (parts[2] >= 0 && parts[2] < 60))
  );
}

export function stringToDecimalDegrees(coord) {
  // Check if coord is string
  if (typeof coord !== "string") return null;

  const coordCleaned = coord.trim();

  // Check if input contains at least one digit
  if (!/\d/.test(coord)) return null;

  // Check for invalid characters
  if (/[^°"”'’NESW\d\s.+-]/i.test(coord)) return null;

  const directionMultiplier = determineDirectionMultiplier(coordCleaned);
  const coordWithoutDirection = coordCleaned.replace(/[NSEW-]/gi, "").trim();

  const parts = extractCoordinateParts(coordWithoutDirection);

  if (!parts) return null;

  // Validating the format:
  if (coordCleaned.match(/[NS]$/i)) {
    if (!isValidLatitudeDMS(parts)) return null;
  } else if (coordCleaned.match(/[EW]$/i)) {
    if (!isValidLongitudeDMS(parts)) return null;
  }

  return computeDecimalDegrees(parts) * directionMultiplier;
}

export default stringToDecimalDegrees;

// function test(coord, expected) {
//   const result = stringToDecimalDegrees(coord);
//   const resultColor = "\x1b[33m"; // Yellow color
//   const resetColor = "\x1b[0m"; // Reset color

//   console.log(
//     `${coord} = ${resultColor}${result}${resetColor}\n(Expected: ${expected})\n`
//   );
// }

// test("412412.2N", 41.40338889);
// test("4124.202N", 41.40336667);
// test("41.4034N", 41.4034);
// test("412412N", 41.40333333);
// test("412412.2S", -41.40338889);
// test("412412.2W", -41.40338889);
// test("1763424.55W", -176.5734861);
// test("53 14 44.943N", 53.2458175);
// test(`53°14'44.943"N`, 53.2458175);
// test(`53° 14' 44.943" N`, 53.2458175);
// test("41241.202N", null);
// test("41241.202", null);
// test("4124.202P", null);
// test("", null);

// // Additional Valid Tests
// test("180E", 180); // Maximum valid longitude.
// test("90N", 90); // Maximum valid latitude.
// test("0W", 0); // Edge case for zero longitude.
// test("0N", 0); // Edge case for zero latitude.
// test("-90", -90); // South using minus.
// test("-180", -180); // West using minus.
// test("90", 90); // North.
// test("180", 180); // East.

// // DMS and DM format with different spacings
// test("53 14 44.943 N", 53.2458175);
// test("53 14.943N", 53.24905);
// test("53°14’44.943”N", 53.2458175); // Using different symbols

// // Out of range values
// test("191°14'44.943\"E", null); // Longitude greater than 180.
// test("93°14'44.943\"N", null); // Latitude greater than 90.
// test("53°61'44.943\"N", null); // Minutes greater than 59.
// test("53°14'65.943\"N", null); // Seconds greater than 59.

// // Strings with invalid characters or format
// test("4124.202$", null); // Invalid symbol.
// test("53°14'44.943\"Z", null); // Invalid direction.

// // Edge cases
// test(" ", null); // Just a space.
// test("N", null); // Only direction.
// test("53°14'", 53.23333333); // Missing seconds in DMS format.
