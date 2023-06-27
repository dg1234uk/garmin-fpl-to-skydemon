import fs from 'fs';
import xml2js from 'xml-js';
import path from 'path';

const DEFAULT_INPUT_DIRECTORY = './input';
const DEFAULT_OUTPUT_DIRECTORY = './output';

// Helper function to log errors to console
function logError(message) {
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
async function writeFile(filePath, content) {
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
export function isValidJsonStructure(inputJson) {
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

// Extracts waypoints from input JSON
export function extractWaypoints(inputJson) {
  const routePoints = inputJson['flight-plan']['route']['route-point'];
  if (!Array.isArray(routePoints)) {
    return null;
  }

  const waypointTable = inputJson['flight-plan']['waypoint-table']['waypoint'];
  const waypoints = [];

  // Loop through route points and extract waypoints
  for (const point of routePoints) {
    const waypointIdentifier =
      point['waypoint-identifier'] && point['waypoint-identifier']['_text'];

    const waypoint = waypointTable.find(
      (wp) =>
        wp['identifier'] && wp['identifier']['_text'] === waypointIdentifier
    );

    // Extract latitude and longitude
    if (waypoint && waypoint['lat'] && waypoint['lon']) {
      const lat = parseFloat(waypoint['lat']['_text']);
      const lon = parseFloat(waypoint['lon']['_text']);

      if (!isNaN(lat) && !isNaN(lon)) {
        const latString = convertLatitude(lat);
        const lonString = convertLongitude(lon);

        if (latString && lonString) {
          waypoints.push(`${latString} ${lonString}`);
        }
      }
    }
  }
  return waypoints;
}

// Constructs the output JSON structure
export function constructOutputJson(waypoints) {
  return {
    DivelementsFlightPlanner: {
      PrimaryRoute: {
        _attributes: {
          CourseType: 'GreatCircle',
          Start: waypoints[0],
          Level: '3000',
          Rules: 'Vfr',
          PlannedFuel: '1.000000',
        },
        RhumbLineRoute: waypoints.slice(1).map((to) => ({
          _attributes: { To: to, Level: 'MSL', LevelChange: 'B' },
        })),
        ReferencedAirfields: {},
      },
    },
  };
}

// Converts JSON to XML format
function convertJsonToXml(json) {
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    xml2js.json2xml(json, { compact: true, spaces: 2 })
  );
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
    if (err.code === 'ENOENT') {
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

// Core function to get a list of input files from a directory
async function getInputFiles(inputDirectory) {
  try {
    return await fs.promises.readdir(inputDirectory);
  } catch (err) {
    throw new Error(`Error reading directory: ${err}`);
  }
}

// Core function to process an individual file
export async function processFile(inputDirectory, outputDirectory, file) {
  const inputFile = path.join(inputDirectory, file);

  // Skip non .fpl files
  if (path.extname(file).toLowerCase() !== '.fpl') {
    logError(`Skipping non-fpl file: ${file}`);
    return;
  }

  // Read input file
  const inputXml = await readFile(inputFile);
  if (!inputXml) return;

  // Convert XML to JSON
  let inputJson;
  try {
    inputJson = JSON.parse(xml2js.xml2json(inputXml, { compact: true }));
  } catch (err) {
    logError(`Error parsing the XML: ${err.message} in file : ${file}`);
    return;
  }

  // Validate JSON structure
  if (!isValidJsonStructure(inputJson)) {
    logError('Unexpected JSON structure');
    return;
  }

  // Extract waypoints
  const waypoints = extractWaypoints(inputJson);
  if (!waypoints) {
    logError('Unexpected JSON structure: Missing route information');
    return;
  }

  // Construct output JSON and convert to XML
  const outputJson = constructOutputJson(waypoints);
  const outputXml = convertJsonToXml(outputJson);

  // Write the output to a file
  const outputFilePath = path.join(
    outputDirectory,
    path.basename(file, path.extname(file)) + '.flightplan'
  );

  await writeFile(outputFilePath, outputXml);
}

// Main function to start the file processing
async function main() {
  // Set input and output directories from command-line arguments or use defaults
  const [
    inputDirectory = DEFAULT_INPUT_DIRECTORY,
    outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
  ] = process.argv.slice(2);

  // Ensure directories exist
  await ensureDirectoryExists(inputDirectory);
  await ensureDirectoryExists(outputDirectory, true);

  // Get the list of files and process each file
  const files = await getInputFiles(inputDirectory);
  for (const file of files) {
    await processFile(inputDirectory, outputDirectory, file);
  }
}

// Start the program and catch any top-level errors
main().catch((err) => {
  logError('An error occurred:', err.message);
});
