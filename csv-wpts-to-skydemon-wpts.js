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
import { stringToDecimalDegrees } from "./utils/stringToDecimalDegrees.js";

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

// Extracts waypoints from input JSON
export function extractWaypoints(inputJson) {
  const waypoints = inputJson.map((item) => {
    const DdLat = stringToDecimalDegrees(String(item.latitude));
    const DdLon = stringToDecimalDegrees(String(item.longitude));
    console.log(item.latitude);
    console.log(DdLat);
    console.log(
      JSON.stringify({
        lat: { _text: DdLat },
        lon: { _text: DdLon },
        identifier: { _text: item.name },
      })
    );
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
