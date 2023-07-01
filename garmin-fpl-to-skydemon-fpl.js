import path from "path";
import xml2js from "xml-js";
import {
  logError,
  readFile,
  writeFile,
  convertLatitude,
  convertLongitude,
  isValidGarminFplJsonStructure,
  getInputFiles,
  ensureDirectoryExists,
  filterFilesByExtension,
} from "./utils/utils.js";

const DEFAULT_INPUT_DIRECTORY = "./input";
const DEFAULT_OUTPUT_DIRECTORY = "./output";

// Converts JSON to XML format
export function convertJsonToXml(json) {
  return `<?xml version="1.0" encoding="utf-8"?>\n${xml2js.json2xml(json, {
    compact: true,
    spaces: 2,
  })}`;
}

// Extracts waypoints from input JSON
export function extractWaypoints(inputJson) {
  const routePoints = inputJson["flight-plan"].route["route-point"];
  if (!Array.isArray(routePoints)) {
    return null;
  }

  const waypointTable = inputJson["flight-plan"]["waypoint-table"].waypoint;
  const waypoints = [];

  // Loop through route points and extract waypoints
  routePoints.forEach((point) => {
    const waypointIdentifier =
      point["waypoint-identifier"] && point["waypoint-identifier"]._text;

    const waypoint = waypointTable.find(
      (wp) => wp.identifier && wp.identifier._text === waypointIdentifier
    );

    // Extract latitude and longitude
    if (waypoint && waypoint.lat && waypoint.lon) {
      const lat = parseFloat(waypoint.lat._text);
      const lon = parseFloat(waypoint.lon._text);

      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        const latString = convertLatitude(lat);
        const lonString = convertLongitude(lon);

        if (latString && lonString) {
          waypoints.push(`${latString} ${lonString}`);
        }
      }
    }
  });
  return waypoints;
}

// Constructs the output JSON structure
export function constructOutputJson(waypoints) {
  return {
    DivelementsFlightPlanner: {
      PrimaryRoute: {
        _attributes: {
          CourseType: "GreatCircle",
          Start: waypoints[0],
          Level: "3000",
          Rules: "Vfr",
          PlannedFuel: "1.000000",
        },
        RhumbLineRoute: waypoints.slice(1).map((to) => ({
          _attributes: { To: to, Level: "MSL", LevelChange: "B" },
        })),
        ReferencedAirfields: {},
      },
    },
  };
}

// Core function to process an individual file
export async function processFile(inputDirectory, outputDirectory, file) {
  const inputFile = path.join(inputDirectory, file);

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
    logError("Unexpected JSON structure");
    return;
  }

  // Extract waypoints
  const waypoints = extractWaypoints(inputJson);
  if (!waypoints) {
    logError("Unexpected JSON structure: Missing route information");
    return;
  }

  // Construct output JSON and convert to XML
  const outputJson = constructOutputJson(waypoints);
  const outputXml = convertJsonToXml(outputJson);

  // Write the output to a file
  const outputFilePath = path.join(
    outputDirectory,
    `${path.basename(file, path.extname(file))}.flightplan`
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
  const fplFiles = filterFilesByExtension(files, ".fpl");
  fplFiles.forEach(async (file) =>
    processFile(inputDirectory, outputDirectory, file)
  );
}

// Start the program and catch any top-level errors
main().catch((err) => {
  const errorMessage = err.message || "An unknown error occurred";
  logError("An error occurred:", errorMessage);
});
