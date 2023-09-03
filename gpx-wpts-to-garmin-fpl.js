import xml2js from "xml-js";
import path from "path";
import {
  readFile,
  writeFile,
  logError,
  ensureDirectoryExists,
  getInputFiles,
  filterFilesByExtension,
  isValidGarminFplJsonStructure,
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

export function isValidGpxJsonStructure(json) {
  // Ensure the main 'gpx' key is present
  if (!json.gpx) {
    return false;
  }

  const waypoints = json.gpx.wpt;

  // Ensure waypoints are present
  if (!waypoints || !Array.isArray(waypoints)) {
    return false;
  }

  // Validate each waypoint
  return waypoints.every(
    (waypoint) =>
      waypoint._attributes &&
      waypoint._attributes.lat &&
      waypoint._attributes.lon &&
      waypoint.name &&
      waypoint.name._text
  );
}

// Core function to process a single file
// Reads the file, converts it to JSON, validates the structure, and extracts waypoints
async function processFile(inputDirectory, file) {
  const inputFile = path.join(inputDirectory, file);

  // Read input file
  const inputXml = await readFile(inputFile);
  if (!inputXml) return [];

  const inputJson = convertXmlToJson(inputXml, file);

  // TODO: Validate JSON structure is correct GPX format
  if (!isValidGpxJsonStructure(inputJson)) {
    logError("Unexpected JSON structure");
    return [];
  }

  // Extract waypoints from the JSON. This might vary based on your GPX structure
  return inputJson.gpx.wpt;
}

function constructOutputJson(waypoints) {
  const output = {
    _declaration: {
      _attributes: {
        version: "1.0",
        encoding: "utf-8",
      },
    },
    "flight-plan": {
      _attributes: {
        xmlns: "http://www8.garmin.com/xmlschemas/FlightPlan/v1",
      },
      created: {
        _text: new Date().toISOString(),
      },
    },
  };

  const waypointTable = {
    waypoint: waypoints.map((waypoint) => ({
      identifier: {
        _text: waypoint.name._text,
      },
      type: {
        _text: "USER WAYPOINT",
      },
      "country-code": {
        _text: "__",
      },
      lat: {
        _text: waypoint._attributes.lat,
      },
      lon: {
        _text: waypoint._attributes.lon,
      },
      comment: {
        _text: "",
      },
    })),
  };

  const route = {
    "route-name": {
      _text: "Waypoints",
    },
    "flight-plan-index": {
      _text: "1",
    },
    "route-point": waypoints.map((waypoint) => ({
      "waypoint-identifier": {
        _text: waypoint.name._text,
      },
      "waypoint-type": {
        _text: "USER WAYPOINT",
      },
      "waypoint-country-code": {
        _text: "__",
      },
    })),
  };

  output["flight-plan"]["waypoint-table"] = waypointTable;
  output["flight-plan"].route = route;

  return output;
}

// Removes duplicate waypoints
export function removeDuplicateWaypoints(waypoints) {
  const seen = {};
  const uniqueWaypoints = [];

  waypoints.forEach((waypoint) => {
    const { lat } = waypoint._attributes;
    const { lon } = waypoint._attributes;
    const name = waypoint.name._text;

    // Create a unique key for the combination of lat, lon, and name
    const key = `${lat}-${lon}-${name}`;

    if (!seen[key]) {
      uniqueWaypoints.push(waypoint);
      seen[key] = true;
    }
  });

  return uniqueWaypoints;
}

// Sorts waypoints alphabetically by name
export function sortWaypoints(waypoints) {
  waypoints.sort((a, b) => {
    if (a.name._text < b.name._text) {
      return -1;
    }
    if (a.name._text > b.name._text) {
      return 1;
    }
    return 0;
  });

  return waypoints;
}

export async function processFiles(inputDirectory, outputDirectory) {
  const files = await getInputFiles(inputDirectory);

  const gpxFiles = filterFilesByExtension(files, ".gpx");

  let allWaypoints = [];

  const waypointPromises = gpxFiles.map(async (file) => {
    const waypoints = await processFile(inputDirectory, file);
    return waypoints || []; // Ensure we always return an array, even if waypoints is undefined
  });

  const allWaypointsArrays = await Promise.all(waypointPromises);

  allWaypointsArrays.forEach((waypoints) => {
    allWaypoints = allWaypoints.concat(waypoints);
  });

  // Remove duplicates
  const uniqueWaypoints = removeDuplicateWaypoints(allWaypoints);

  // Sort waypoints alphabetically by name
  const sortedWaypoints = sortWaypoints(uniqueWaypoints);

  const output = constructOutputJson(sortedWaypoints);

  if (!isValidGarminFplJsonStructure(output)) {
    throw new Error("Unexpected JSON structure");
  }

  // Convert the output JSON back to XML
  const outputXml = xml2js.json2xml(output, { compact: true, spaces: 2 });
  // Write the output to a file
  const outputFilePath = path.join(outputDirectory, "waypoints-fpl.fpl");

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
