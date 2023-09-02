import fs from "fs";
import path from "path";

// Helper function to log errors to console
export function logError(message) {
  console.error(message);
}

// Helper function to asynchronously read a file and return its contents
export async function readFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, "utf8");
  } catch (err) {
    logError(`Error reading the file: ${err}`);
    return null;
  }
}

// Helper function to asynchronously write content to a file
export async function writeFile(filePath, content) {
  try {
    await fs.promises.writeFile(filePath, content, "utf8");
    console.log(`File has been saved to ${filePath}`);
  } catch (err) {
    logError(`Error writing the file: ${err}`);
  }
}

// Helper function to filter list of files by extension
export function filterFilesByExtension(files, extension) {
  return files.filter((file) => {
    const fileExtension = path.extname(file).toLowerCase();
    const isMatch = fileExtension === extension;
    if (!isMatch) {
      logError(
        `Filtered out ${file} due to mismatched extension. Expected: ${extension}, but got: ${fileExtension}`
      );
    }
    return isMatch;
  });
}

export function toDecimalDegrees(coord) {
  // Check if coord is string
  if (typeof coord !== "string") return null;

  const coordCleaned = coord.trim();

  // Check for Direction (NSEW or + -)
  const directionRegex = /^[NSEW]|([NSEW])$/i;

  const matched = coordCleaned.match(directionRegex);
  let nsew = null;
  let direction = 1;
  if (matched) {
    nsew = matched[0].toUpperCase(); // return the matched direction in uppercase
    if (nsew === "S" || nsew === "W") direction = -1;
  } else if (coordCleaned.match(/^[+-]/)) {
    if (coordCleaned.match(/^[+-]/)[0] === "-") direction = -1;
  }

  const coordStripped = coordCleaned.replace(/[NSEW]/gi, "");

  function setDecimal(value) {
    let decimal = Number(".".concat(value));
    if (Number.isNaN(decimal)) {
      decimal = 0;
    }
    return decimal;
  }

  // If separtors split into sequences
  let parts;
  if (coordStripped.match(/[^0-9.]/)) {
    const groups = coordStripped.split(/[^0-9.]+/);
    const [degrees, minutes, seconds] = groups;
    parts = [Number(degrees), Number(minutes), Number(seconds)];
  } else {
    const [integerPart, decimalPart] = coordStripped.split(".");
    if (integerPart.length === 7) {
      // Longitude DMS.s format dddmmss
      const degrees = Number(integerPart.slice(0, 3));
      const minutes = Number(integerPart.slice(3, 5));
      const seconds = Number(integerPart.slice(5, 7)) + setDecimal(decimalPart);
      parts = [degrees, minutes, seconds];
    } else if (integerPart.length === 6) {
      // Latitude DMS.s format ddmmss
      const degrees = Number(integerPart.slice(0, 2));
      const minutes = Number(integerPart.slice(2, 4));
      const seconds = Number(integerPart.slice(4, 6)) + setDecimal(decimalPart);
      parts = [degrees, minutes, seconds];
    } else if (integerPart.length === 5) {
      // Longitude DM.m format dddmm
      const degrees = Number(integerPart.slice(0, 3));
      const minutes = Number(integerPart.slice(3, 5)) + setDecimal(decimalPart);
      parts = [degrees, minutes];
    } else if (integerPart.length === 4) {
      // Latitude DM.m format ddmm
      const degrees = Number(integerPart.slice(0, 2));
      const minutes = Number(integerPart.slice(2, 4)) + setDecimal(decimalPart);
      parts = [degrees, minutes];
    } else if (integerPart.length <= 3) {
      // Latitude or Longitude D.d format ddd or dd
      const degrees = Number(integerPart.slice(0, 3)) + setDecimal(decimalPart);
      parts = [degrees];
    }
  }

  if (parts.length === 1) {
    // D.d format
    let result = parts[0];
    result *= direction;
    return result;
  }
  if (parts.length === 2) {
    // DM.m format
    let result = parts[0] + parts[1] / 60;
    result *= direction;
    return result;
  }
  if (parts.length === 3) {
    // DMS.s format
    let result = parts[0] + parts[1] / 60 + parts[2] / 3600;
    result *= direction;
    return result;
  }
  return null;
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
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    logError("Invalid latitude value");
    return null;
  }
  const {
    degree: latDegree,
    minute: latMinute,
    second: latSecond,
  } = convertDd2DMS(lat);
  const latDirection = lat >= 0 ? "N" : "S";

  // Convert and format latitude to string
  const latString = `${latDirection}${Math.abs(latDegree)
    .toString()
    .padStart(2, "0")}${latMinute.toString().padStart(2, "0")}${latSecond
    .toFixed(2)
    .toString()
    .padStart(5, "0")}`;
  return latString;
}

// Convert longitude in decimal degrees to string format
export function convertLongitude(lon) {
  // Validate longitude
  if (typeof lon !== "number" || lon < -180 || lon > 180) {
    logError("Invalid longitude value");
    return null;
  }
  const {
    degree: lonDegree,
    minute: lonMinute,
    second: lonSecond,
  } = convertDd2DMS(lon);
  const lonDirection = lon >= 0 ? "E" : "W";

  // Convert and format longitude to string
  const lonString = `${lonDirection}${Math.abs(lonDegree)
    .toString()
    .padStart(3, "0")}${lonMinute.toString().padStart(2, "0")}${lonSecond
    .toFixed(2)
    .toString()
    .padStart(5, "0")}`;
  return lonString;
}

// Validates JSON structure to ensure it has the expected fields
export function isValidGarminFplJsonStructure(inputJson) {
  if (!inputJson) {
    return false;
  }

  if (!inputJson["flight-plan"]) {
    return false;
  }

  if (!inputJson["flight-plan"].route) {
    return false;
  }

  if (!inputJson["flight-plan"].route["route-point"]) {
    return false;
  }

  if (!inputJson["flight-plan"]["waypoint-table"]) {
    return false;
  }

  if (!inputJson["flight-plan"]["waypoint-table"].waypoint) {
    return false;
  }

  if (!Array.isArray(inputJson["flight-plan"]["waypoint-table"].waypoint)) {
    return false;
  }

  if (!Array.isArray(inputJson["flight-plan"].route["route-point"])) {
    return false;
  }

  return true;
}

// Helper function to get a list of input files from a directory
export async function getInputFiles(inputDirectory) {
  try {
    return await fs.promises.readdir(inputDirectory);
  } catch (err) {
    throw new Error(`Error reading directory: ${err}`);
  }
}

// Core function to ensure that the specified directory exists
export async function ensureDirectoryExists(
  directoryPath,
  createIfNotExist = false
) {
  try {
    await fs.promises.access(directoryPath);
    const stats = await fs.promises.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${directoryPath}`);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      if (createIfNotExist) {
        await fs.promises.mkdir(directoryPath, { recursive: true });
      } else {
        throw new Error(`Directory does not exist: ${directoryPath}`);
      }
    } else {
      throw new Error(`Error accessing the directory: ${err}`);
    }
  }
}
