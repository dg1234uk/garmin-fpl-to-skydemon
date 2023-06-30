import fs from 'fs';

// Helper function to log errors to console
export function logError(message) {
  console.error(message);
}

// Helper function to asynchronously read a file and return its contents
export async function readFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    logError(`Error reading the file: ${err}`);
    return null;
  }
}

// Helper function to asynchronously write content to a file
export async function writeFile(filePath, content) {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log(`File has been saved to ${filePath}`);
  } catch (err) {
    logError(`Error writing the file: ${err}`);
  }
}

// Convert Decimal Degrees to Degrees, Minutes, Seconds
export function convertDd2DMS(decimalDegrees) {
  const sign = Math.sign(decimalDegrees);
  const absDd = Math.abs(decimalDegrees);

  const degree = Math.floor(absDd);
  const minute = Math.floor((absDd - degree) * 60);
  const second = ((absDd - degree) * 60 - minute) * 60;

  return { degree: sign * degree, minute, second };
}

// Convert latitude in decimal degrees to string format
export function convertLatitude(lat) {
  // Validate latitude
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    logError('Invalid latitude value');
    return null;
  }
  const {
    degree: latDegree,
    minute: latMinute,
    second: latSecond,
  } = convertDd2DMS(lat);
  const latDirection = lat >= 0 ? 'N' : 'S';

  // Convert and format latitude to string
  const latString = `${latDirection}${Math.abs(latDegree)
    .toString()
    .padStart(2, '0')}${latMinute.toString().padStart(2, '0')}${latSecond
    .toFixed(2)
    .toString()
    .padStart(5, '0')}`;
  return latString;
}

// Convert longitude in decimal degrees to string format
export function convertLongitude(lon) {
  // Validate longitude
  if (typeof lon !== 'number' || lon < -180 || lon > 180) {
    logError('Invalid longitude value');
    return null;
  }
  const {
    degree: lonDegree,
    minute: lonMinute,
    second: lonSecond,
  } = convertDd2DMS(lon);
  const lonDirection = lon >= 0 ? 'E' : 'W';

  // Convert and format longitude to string
  const lonString = `${lonDirection}${Math.abs(lonDegree)
    .toString()
    .padStart(3, '0')}${lonMinute.toString().padStart(2, '0')}${lonSecond
    .toFixed(2)
    .toString()
    .padStart(5, '0')}`;
  return lonString;
}

// Validates JSON structure to ensure it has the expected fields
export function isValidGarminFplJsonStructure(inputJson) {
  if (!inputJson) {
    return false;
  }

  if (!inputJson['flight-plan']) {
    return false;
  }

  if (!inputJson['flight-plan']['route']) {
    return false;
  }

  if (!inputJson['flight-plan']['route']['route-point']) {
    return false;
  }

  if (!inputJson['flight-plan']['waypoint-table']) {
    return false;
  }

  if (!inputJson['flight-plan']['waypoint-table']['waypoint']) {
    return false;
  }

  if (!Array.isArray(inputJson['flight-plan']['waypoint-table']['waypoint'])) {
    return false;
  }

  if (!Array.isArray(inputJson['flight-plan']['route']['route-point'])) {
    return false;
  }

  return true;
}
