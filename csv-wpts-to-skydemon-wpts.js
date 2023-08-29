import path from "path";
import xml2js from "xml-js";
import Papa from "papaparse";
import {
  ensureDirectoryExists,
  filterFilesByExtension,
  getInputFiles,
  logError,
  readFile,
  writeFile,
} from "./utils/utils.js";

const DEFAULT_INPUT_DIRECTORY = "./input";
const DEFAULT_OUTPUT_DIRECTORY = "./output";

// Convert CSV to JSON
export function convertCsvToJson(inputCsv) {
  const results = Papa.parse(inputCsv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (results.errors.length) {
    logError("Error parsing the CSV:", results.errors);
    return null;
  }
  return results.data;
}

/**
 * Converts a coordinate string in various formats (DMS, DM.m, D.d) to decimal degrees.
 * @param {string} coord - The coordinate string (e.g., 412412.2N, 4124.202N, 41.4034N, 412412N).
 * @returns {number|null} The coordinate in decimal degrees or null if format is not recognized.
 */
function toDecimalDegrees(coord) {
  // Define a list of expected patterns for various coordinate formats.
  const patterns = [
    { format: "DMSs", pattern: /^(\d{1,3})(\d{2})(\d{2}\.\d+)([NSEW])$/ }, // DMS with decimal seconds (e.g., 412412.2N)
    { format: "DMm", pattern: /^(\d{1,3})(\d{2}\.\d+)([NSEW])$/ }, // DM with decimal minutes (e.g., 4124.202N)
    { format: "Dd", pattern: /^(\d+\.\d+)([NSEW])$/ }, // Pure decimal (e.g., 41.4034N)
    { format: "DMS", pattern: /^(\d{1,3})(\d{2})(\d{2})([NSEW])$/ }, // Standard DMS without any decimal (e.g., 412412N)
  ];

  // Initialize the variable to store the converted value.
  let decimal = null;

  // Loop through each pattern and attempt to match the input coordinate.
  patterns.forEach((patternObj) => {
    const match = coord.match(patternObj.pattern);
    // If a match is found and the value hasn't been set yet...
    if (match && decimal === null) {
      // Extract and parse degree, minute, and second components.
      const deg = parseFloat(match[1]);
      const min = parseFloat(match[2] || 0);
      const sec = parseFloat(match[3] || 0);

      // Determine the direction (N, S, E, W) to decide if value should be negative.
      const dir = match[4] || match[5]; // Adjust for patterns that might have different group counts

      // Calculate the decimal degree value.
      decimal = deg + min / 60 + sec / 3600;

      // If the direction is South or West, the value should be negative.
      if (dir === "S" || dir === "W") decimal *= -1;
    }
  });

  // Return the converted decimal degree value (or null if no format matched).
  return decimal;
}

// Extracts waypoints from input JSON
export function extractWaypoints(inputJson) {
  const waypoints = inputJson.map((item) => {
    const DdLat = toDecimalDegrees(item.latitude);
    const DdLon = toDecimalDegrees(item.longitude);
    return {
      lat: { _text: DdLat },
      lon: { _text: DdLon },
      identifier: { _text: item.name },
    };
  });
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
  const inputCsv = await readFile(inputFile);
  if (!inputCsv) return [];

  const inputJson = convertCsvToJson(inputCsv);

  // TODO: Validate the input CSV structure

  // Extract waypoints
  const waypoints = extractWaypoints(inputJson);

  return waypoints;
}

// Process all files in the input directory
// Filters for .csv files, processes them, removes duplicate waypoints, sorts waypoints,
// constructs output JSON, converts it to XML, and writes it to a file in the output directory
export async function processFiles(inputDirectory, outputDirectory) {
  const files = await getInputFiles(inputDirectory);

  const csvFiles = filterFilesByExtension(files, ".csv");

  let allWaypoints = [];

  const waypointPromises = csvFiles.map(async (file) => {
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
  const outputFilePath = path.join(outputDirectory, "csv-waypoints.gpx");

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
