import path from 'path';
import xml2js from 'xml-js';
import {
  ensureDirectoryExists,
  getInputFiles,
  isValidGarminFplJsonStructure,
  logError,
  readFile,
  writeFile,
} from './utils/utils.js';

const DEFAULT_INPUT_DIRECTORY = './input';
const DEFAULT_OUTPUT_DIRECTORY = './output';

// Extracts waypoints from input JSON
export function extractWaypoints(inputJson) {
  const waypoints = inputJson['flight-plan']['waypoint-table']['waypoint'];
  return waypoints;
}

// Core function to process a single file
async function processFile(inputDirectory, outputDirectory, file) {
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
  if (!isValidGarminFplJsonStructure(inputJson)) {
    logError('Unexpected JSON structure');
    return;
  }

  // Extract waypoints
  const waypoints = extractWaypoints(inputJson);
  if (!waypoints) {
    logError('Unexpected JSON structure: waypoint information');
    return;
  }

  return waypoints;
}

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

  let allWaypoints = [];
  for (const file of files) {
    const waypoints = await processFile(inputDirectory, outputDirectory, file);
    allWaypoints = allWaypoints.concat(waypoints);
  }

  // Remove duplicates
  const uniqueWaypoints = Array.from(
    new Set(allWaypoints.map(JSON.stringify))
  ).map(JSON.parse);

  // Sort waypoints alphabetically by name
  uniqueWaypoints.sort((a, b) => {
    if (a.identifier._text < b.identifier._text) {
      return -1;
    }
    if (a.identifier._text > b.identifier._text) {
      return 1;
    }
    return 0;
  });

  // Create a new JSON structure for the output XML
  const output = {
    _declaration: { _attributes: { version: '1.0', encoding: 'utf-8' } },
    gpx: {
      _attributes: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation':
          'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
        version: '1.1',
        creator: 'SkyDemon',
        xmlns: 'http://www.topografix.com/GPX/1/1',
      },
      wpt: uniqueWaypoints.map((waypoint) => ({
        _attributes: {
          lat: waypoint.lat._text,
          lon: waypoint.lon._text,
        },
        name: { _text: waypoint.identifier._text },
        sym: { _text: 'Circle' },
        extensions: {
          identifier: { _text: '' },
          category: { _text: '' },
        },
      })),
    },
  };

  // Convert the output JSON back to XML
  const outputXml = xml2js.json2xml(output, { compact: true, spaces: 2 });
  // Write the output to a file
  const outputFilePath = path.join(outputDirectory, 'waypoints.gpx');

  await writeFile(outputFilePath, outputXml);
}

// Start the program and catch any top-level errors
main().catch((err) => {
  logError('An error occurred:', err.message);
});
