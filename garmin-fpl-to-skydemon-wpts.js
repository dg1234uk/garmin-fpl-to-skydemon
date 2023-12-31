import path from "path";
import xml2js from "xml-js";
import {
  ensureDirectoryExists,
  filterFilesByExtension,
  getInputFiles,
  isValidGarminFplJsonStructure,
  logError,
  readFile,
  writeFile,
} from "./utils/utils.js";

const DEFAULT_INPUT_DIRECTORY = "./input";
const DEFAULT_OUTPUT_DIRECTORY = "./output";

// Convert XML to JSON
// If the XML is invalid, log an error and return null
export function convertXmlToJson(inputXml, file) {
  try {
    const inputJson = JSON.parse(xml2js.xml2json(inputXml, { compact: true }));
    return inputJson;
  } catch (err) {
    logError(`Error parsing the XML: ${err.message} in file : ${file}`);
    return null;
  }
}

// Extracts waypoints from input JSON
export function extractWaypoints(inputJson) {
  const waypoints = inputJson["flight-plan"]["waypoint-table"].waypoint || [];
  if (waypoints.length === 0) {
    logError("No waypoints found in the input file");
  }
  return waypoints;
}

// Removes duplicate waypoints
export function removeDuplicates(waypoints) {
  return Array.from(new Set(waypoints.map(JSON.stringify))).map(JSON.parse);
}

// Sorts waypoints alphabetically by name
export function sortWaypoints(uniqueWaypoints) {
  uniqueWaypoints.sort((a, b) => {
    if (a.identifier._text < b.identifier._text) {
      return -1;
    }
    if (a.identifier._text > b.identifier._text) {
      return 1;
    }
    return 0;
  });

  return uniqueWaypoints;
}

// Constructs the output JSON structure
export function constructOutputJson(waypoints) {
  const output = {
    _declaration: { _attributes: { version: "1.0", encoding: "utf-8" } },
    gpx: {
      _attributes: {
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xsi:schemaLocation":
          "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd",
        version: "1.1",
        creator: "SkyDemon",
        xmlns: "http://www.topografix.com/GPX/1/1",
      },
      wpt: waypoints.map((waypoint) => ({
        _attributes: {
          lat: waypoint.lat._text,
          lon: waypoint.lon._text,
        },
        name: { _text: waypoint.identifier._text },
        sym: { _text: "Circle" },
        extensions: {
          identifier: { _text: "" },
          category: { _text: "" },
        },
      })),
    },
  };
  return output;
}

// Core function to process a single file
// Reads the file, converts it to JSON, validates the structure, and extracts waypoints
async function processFile(inputDirectory, file) {
  const inputFile = path.join(inputDirectory, file);

  // Read input file
  const inputXml = await readFile(inputFile);
  if (!inputXml) return [];

  const inputJson = convertXmlToJson(inputXml, file);

  // Validate JSON structure
  if (!isValidGarminFplJsonStructure(inputJson)) {
    logError("Unexpected JSON structure");
    return [];
  }

  // Extract waypoints
  const waypoints = extractWaypoints(inputJson);

  return waypoints;
}

// Process all files in the input directory
// Filters for .fpl files, processes them, removes duplicate waypoints, sorts waypoints,
// constructs output JSON, converts it back to XML, and writes it to a file in the output directory
export async function processFiles(inputDirectory, outputDirectory) {
  const files = await getInputFiles(inputDirectory);

  const fplFiles = filterFilesByExtension(files, ".fpl");

  let allWaypoints = [];

  const waypointPromises = fplFiles.map(async (file) => {
    const waypoints = await processFile(inputDirectory, file);
    return waypoints || []; // Ensure we always return an array, even if waypoints is undefined
  });

  const allWaypointsArrays = await Promise.all(waypointPromises);

  allWaypointsArrays.forEach((waypoints) => {
    allWaypoints = allWaypoints.concat(waypoints);
  });

  // Remove duplicates
  const uniqueWaypoints = removeDuplicates(allWaypoints);

  // Sort waypoints alphabetically by name
  const sortedWaypoints = sortWaypoints(uniqueWaypoints);

  const output = constructOutputJson(sortedWaypoints);

  // Convert the output JSON back to XML
  const outputXml = xml2js.json2xml(output, { compact: true, spaces: 2 });
  // Write the output to a file
  const outputFilePath = path.join(outputDirectory, "fpl-waypoints.gpx");

  await writeFile(outputFilePath, outputXml);
}

// Main function to start the program
// Sets input and output directories, ensures they exist, and processes the files
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
  await processFiles(inputDirectory, outputDirectory);
}

// Start the program and catch any top-level errors
main().catch((err) => {
  const errorMessage = err.message || "An unknown error occurred";
  logError("An error occurred:", errorMessage);
});
