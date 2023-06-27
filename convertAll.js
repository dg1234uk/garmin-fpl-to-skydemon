import fs from 'fs';
import xml2js from 'xml-js';
import path from 'path';

const DEFAULT_INPUT_DIRECTORY = './input';
const DEFAULT_OUTPUT_DIRECTORY = './output';

// Helper functions
function logError(message) {
  console.error(message);
}

async function readFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    logError(`Error reading the file: ${err}`);
    return null;
  }
}

async function writeFile(filePath, content) {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log(`File has been saved to ${filePath}`);
  } catch (err) {
    logError(`Error writing the file: ${err}`);
  }
}

function convertDd2DMS(Dd) {
  const sign = Math.sign(Dd);
  const absDd = Math.abs(Dd);

  const degree = Math.floor(absDd);
  const minute = Math.floor((absDd - degree) * 60);
  const second = ((absDd - degree) * 60 - minute) * 60;

  return { degree: sign * degree, minute, second };
}

function convertLatitude(lat) {
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

  const latString = `${latDirection}${Math.abs(latDegree)
    .toString()
    .padStart(2, '0')}${latMinute.toString().padStart(2, '0')}${latSecond
    .toFixed(2)
    .toString()
    .padStart(5, '0')}`;
  return latString;
}

function convertLongitude(lon) {
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
  const lonString = `${lonDirection}${Math.abs(lonDegree)
    .toString()
    .padStart(3, '0')}${lonMinute.toString().padStart(2, '0')}${lonSecond
    .toFixed(2)
    .toString()
    .padStart(5, '0')}`;
  return lonString;
}

function isValidJsonStructure(inputJson) {
  return (
    inputJson &&
    inputJson['flight-plan'] &&
    inputJson['flight-plan']['waypoint-table'] &&
    Array.isArray(inputJson['flight-plan']['waypoint-table']['waypoint'])
  );
}

function extractWaypoints(inputJson) {
  const routePoints = inputJson['flight-plan']['route']['route-point'];
  if (!Array.isArray(routePoints)) {
    return null;
  }

  const waypointTable = inputJson['flight-plan']['waypoint-table']['waypoint'];
  const waypoints = [];

  for (const point of routePoints) {
    const waypointIdentifier =
      point['waypoint-identifier'] && point['waypoint-identifier']['_text'];

    const waypoint = waypointTable.find(
      (wp) =>
        wp['identifier'] && wp['identifier']['_text'] === waypointIdentifier
    );

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

function constructOutputJson(waypoints) {
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

function convertJsonToXml(json) {
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    xml2js.json2xml(json, { compact: true, spaces: 2 })
  );
}

// Core functions

async function ensureDirectoryExists(directoryPath, createIfNotExist = false) {
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

async function getInputFiles(inputDirectory) {
  try {
    return await fs.promises.readdir(inputDirectory);
  } catch (err) {
    throw new Error(`Error reading directory: ${err}`);
  }
}

async function processFile(inputDirectory, outputDirectory, file) {
  const inputFile = path.join(inputDirectory, file);

  if (path.extname(file).toLowerCase() !== '.fpl') {
    logError(`Skipping non-fpl file: ${file}`);
    return;
  }

  const inputXml = await readFile(inputFile);
  if (!inputXml) return;

  let inputJson;
  try {
    inputJson = JSON.parse(xml2js.xml2json(inputXml, { compact: true }));
  } catch (err) {
    logError(`Error parsing the XML: ${err.message} in file : ${file}`);
    return;
  }

  if (!isValidJsonStructure(inputJson)) {
    logError('Unexpected JSON structure');
    return;
  }

  const waypoints = extractWaypoints(inputJson);
  if (!waypoints) {
    logError('Unexpected JSON structure: Missing route information');
    return;
  }

  const outputJson = constructOutputJson(waypoints);
  const outputXml = convertJsonToXml(outputJson);

  const outputFilePath = path.join(
    outputDirectory,
    path.basename(file, path.extname(file)) + '.flightplan'
  );

  await writeFile(outputFilePath, outputXml);
}

async function main() {
  // Set input and output directories from command-line arguments or use defaults
  const [
    inputDirectory = DEFAULT_INPUT_DIRECTORY,
    outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
  ] = process.argv.slice(2);

  await ensureDirectoryExists(inputDirectory);
  await ensureDirectoryExists(outputDirectory, true);

  const files = await getInputFiles(inputDirectory);

  for (const file of files) {
    await processFile(inputDirectory, outputDirectory, file);
  }
}

main().catch((err) => {
  logError('An error occurred:', err.message);
});
