/**
 * Determines the multiplier for the coordinate value based on its direction.
 * For South and West directions, the coordinate should be negative.
 * @param {string} coord - The coordinate string to evaluate.
 * @returns {number} Returns -1 if direction is South or West, otherwise returns 1.
 */
function getDirectionMultiplier(coord) {
  // Regular expression to test if string starts with or ends with 'S' or 'W' (case insensitive)
  const southWestDirectionRegex = /^[SW]|([SW])$/i;

  // Check if the coordinate direction is either South or West.
  // If yes, return -1 to indicate the negative direction.
  if (southWestDirectionRegex.test(coord)) return -1;

  // Check if the coordinate string starts with a negative sign (-).
  // If yes, return -1 to indicate the negative direction.
  if (coord.startsWith("-")) return -1;

  // If none of the above conditions are met, return 1 (default positive direction).
  return 1;
}

/**
 * Validates the provided coordinates in DMS format.
 * @param {Array<number>} coordinateParts - Array containing the degrees, minutes, and seconds.
 * @param {boolean} isLatitude - Indicates if the coordinate is a latitude.
 * @returns {boolean} True if coordinates are valid, false otherwise.
 */

function isValidDMSCoordinates(coordinateParts, isLatitude) {
  // Check if coordinateParts is provided and contains at least one value
  if (!coordinateParts || coordinateParts.length < 1) return false;

  // Destructure the coordinate parts into respective values
  const [degrees, minutes, seconds] = coordinateParts;

  // Validate latitude: should be within the range of -90 to 90 degrees
  if (isLatitude && (degrees < 0 || degrees > 90)) return false;
  // Validate longitude: should be within the range of -180 to 180 degrees
  if (!isLatitude && (degrees < 0 || degrees > 180)) return false;
  // Validate minutes: should be within the range of 0 to 59.999... (since it cannot be equal to 60)
  if (minutes !== undefined && (minutes < 0 || minutes >= 60)) return false;
  // Validate seconds: should be within the range of 0 to 59.999... (similarly, cannot be equal to 60)
  if (seconds !== undefined && (seconds < 0 || seconds >= 60)) return false;

  // Return true if all validations pass
  return true;
}

/**
 * Extracts the parts of the coordinate from the string.
 * Supports various formats like D° M' S.s", DMS.s, DM.m, and D.d.
 * @param {string} coord - The coordinate string to extract parts from.
 * @returns {Array<number>|null} Array containing the degrees, minutes, and seconds, or null if extraction fails.
 */
function extractCoordinateParts(coord) {
  // Helper function to convert a string value to a decimal fraction.
  function convertToDecimalFraction(value) {
    const decimal = Number(`.${value}`);
    return Number.isNaN(decimal) ? 0 : decimal;
  }

  // Try pattern matching for D° M' S.s" N format
  const dmsPattern = coord.match(
    /^(\d+(\.\d+)?)°\s*(\d+(\.\d+)?)?\s*['’]?\s*(\d+(\.\d+)?)?\s*["”]?/
  );

  if (dmsPattern) {
    const [
      ,
      // fullMatch
      degrees,
      degreesDecimal,
      minutes,
      minutesDecimal,
      seconds,
      // secondsDecimal,
    ] = dmsPattern;

    // Validation: Reject format if degrees contain decimals and there are minutes or seconds
    if (degreesDecimal && (minutes || seconds)) return null;
    // Validation: Reject format if minutes contain decimals and there are seconds
    if (minutesDecimal && seconds) return null;

    const coordinateParts = [
      Number(degrees),
      Number(minutes) || 0,
      seconds ? Number(seconds) : 0,
    ];
    if (!isValidDMSCoordinates(coordinateParts, false)) return null;
    return coordinateParts;
  }

  // If the string has characters other than digits or dot
  if (coord.match(/[^0-9.]/)) {
    // Regular expression for DMS.s, DM.m, or D.d formats
    const alternativeDmsPattern =
      /^(\d+(\.\d+)?)[°\s]*\s*(?:(\d+(\.\d+)?)['’\s]*\s*(?:(\d+(\.\d+)?)["”\s]*)?)?$/;

    // Extract the values using the single regex pattern
    const matches = coord.match(alternativeDmsPattern);
    if (!matches) return null;

    const degrees = matches[1] ? Number(matches[1]) : 0;
    const minutes = matches[3] ? Number(matches[3]) : 0;
    const seconds = matches[5] ? Number(matches[5]) : 0;

    // If the degrees part has a decimal, then neither the minutes nor the seconds parts should be present.
    if (degrees % 1 !== 0 && (minutes !== 0 || seconds !== 0)) return null;

    // If the minutes part has a decimal, then the seconds part should not be present.
    if (minutes % 1 !== 0 && seconds !== 0) return null;

    const coordinateParts = [degrees, minutes, seconds];
    if (!isValidDMSCoordinates(coordinateParts, false)) return null;

    return coordinateParts;
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

  // Splitting the coordinate string into integer and decimal parts
  const [integerPart, decimalPart] = coord.split(".");
  const decimal = convertToDecimalFraction(decimalPart || "");

  // Finding the matching format for the integer part of the coordinate
  const matchedFormat = formats.find((f) => integerPart.length === f.length);
  if (matchedFormat) {
    const coordinateParts = matchedFormat.slices.map((slice) =>
      Number(integerPart.slice(...slice))
    );

    if (!isValidDMSCoordinates(coordinateParts, matchedFormat.length % 2 === 0))
      return null;

    // Adding the decimal value to the last coordinate part
    if (coordinateParts.length === 2) coordinateParts[1] += decimal;
    else if (coordinateParts.length === 3) coordinateParts[2] += decimal;
    return coordinateParts;
  }
  return [Number(integerPart) + decimal];
}

/**
 * Converts a DMS coordinate into its decimal degrees equivalent.
 * @param {Array<number>} coordinateParts - Array containing the degrees, minutes, and seconds.
 * @returns {number} Decimal degrees value.
 */

function computeDecimalDegrees(coordinateParts) {
  const divisors = [1, 60, 3600]; // divisors for degrees, minutes, seconds respectively
  return coordinateParts.reduce(
    (acc, part, index) => acc + part / divisors[index],
    0
  );
}

/**
 * Validates the input coordinate string format.
 * @param {string} coord - The coordinate string to validate.
 * @returns {boolean} True if the input is valid, false otherwise.
 */
function isValidInput(coord) {
  // Check if input contains at least one digit
  if (!/\d/.test(coord)) return false;

  // Check for any invalid characters
  if (/[^°"”'’NESW\d\s.+-]/i.test(coord)) return false;

  // Check for more than one occurrence of N, E, S, W, + or -
  if ((coord.match(/[NESW+-]/gi) || []).length > 1) return false;

  // Check for more than one occurrence of decimal point
  if ((coord.match(/\./g) || []).length > 1) return false;

  // Check if N, E, S, W are found in the middle of the string
  const midCoord = coord.slice(1, -1); // remove first and last characters
  if (/[NESW]/i.test(midCoord)) return false;

  return true; // If all checks pass
}

/**
 * Converts a coordinate string into its decimal degrees equivalent.
 * Supports various formats and checks for validity.
 * @param {string} coord - The coordinate string to convert.
 * @returns {number|null} Decimal degrees value, or null if conversion fails.
 */
export function stringToDecimalDegrees(coord) {
  // Check if coord is string
  if (typeof coord !== "string") return null;

  const trimmedCoordinate = coord.trim();

  if (!isValidInput(trimmedCoordinate)) return null;

  const coordinateDirectionMultiplier =
    getDirectionMultiplier(trimmedCoordinate);
  const coordWithoutDirection = trimmedCoordinate
    .replace(/[NSEW+-]/gi, "")
    .trim();

  const coordinateParts = extractCoordinateParts(coordWithoutDirection);
  if (!coordinateParts) return null;

  // Validating the format:
  if (trimmedCoordinate.match(/[NS]$/i)) {
    if (!isValidDMSCoordinates(coordinateParts, true)) return null;
  } else if (trimmedCoordinate.match(/[EW]$/i)) {
    if (!isValidDMSCoordinates(coordinateParts, false)) return null;
  }

  return computeDecimalDegrees(coordinateParts) * coordinateDirectionMultiplier;
}

export default stringToDecimalDegrees;

function test(coord, expected) {
  const result = stringToDecimalDegrees(coord);
  const resultColor = "\x1b[33m"; // Yellow color
  const resetColor = "\x1b[0m"; // Reset color

  console.log(
    `${coord} = ${resultColor}${result}${resetColor}\n(Expected: ${expected})\n`
  );
}

test("53S23.2458", null);
// test(`53 14.943N`, 53.24905);

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
