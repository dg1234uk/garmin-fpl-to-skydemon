# Garmin Flight Plan to SkyDemon

This repository contains four Node.js tools for flight plan conversion:

1. `garmin-fpl-to-skydemon-wpts.js` - Converts waypoints from Garmin FPL files (`.fpl`) into SkyDemon waypoint files (`.gpx`).
2. `garmin-fpl-to-skydemon-fpl.js` - Transforms Garmin FPL files into SkyDemon Flight Plan files (`.flightplan`).
3. `csv-wpts-to-skydemon-wpts.js` - Converts CSV formatted waypoints into SkyDemon waypoint files (`.gpx`).
4. `gpx-wpts-to-garmin-fpl.js` - Converts GPX formatted waypoints into Garmin Flight Plan files (`.fpl`).

All tools operate by reading input files from a specified directory, processing each file, and then writing the results to an output directory.

## Getting Started

To utilise these tools, ensure you have Node.js installed on your system. Then, clone the repository and install the necessary dependencies.

```bash
git clone https://github.com/dg1234uk/garmin-fpl-to-skydemon.git
cd <repository-directory>
npm install
```

## Usage

The scripts are designed to operate independently. Each script accepts optional arguments specifying the input and output directories. In the absence of these arguments, they default to `./input` and `./output` respectively.

Run the Garmin to SkyDemon waypoints conversion script with:

```bash
node garmin-fpl-to-skydemon-wpts.js [inputDirectory] [outputDirectory]
```

Run the Garmin to SkyDemon Flight Plan conversion script with:

```bash
node garmin-fpl-to-skydemon-fpl.js [inputDirectory] [outputDirectory]
```

Run the CSV to SkyDemon waypoints conversion script with:

```bash
node csv-wpts-to-skydemon-wpts.js [inputDirectory] [outputDirectory]
```

Run the GPX to Garmin Flight Plan conversion script with:

```bash
node gpx-wpts-to-garmin-fpl.js [inputDirectory] [outputDirectory]
```

### Loading Flight Plans onto Garmin G1000

Load the `.fpl` file onto the root directory of the supplemental SD card. Insert SD card into the top slot of the MFD, power cycle the MFD (via CB or aircraft power). Then import the flight plan from the flight plan catalogue page.

## garmin-fpl-to-skydemon-wpts.js

This tool transforms waypoints from Garmin FPL files (`.fpl`) to SkyDemon waypoint files (`.gpx`). During the conversion process, it removes duplicate waypoints and sorts them alphabetically by name.

Key functions of this script include:

- `convertXmlToJson`: Transforms a Garmin FPL file in XML format to JSON.
- `extractWaypoints`: Extracts waypoints from the converted JSON.
- `removeDuplicates`: Removes duplicate waypoints from the extracted waypoints.
- `sortWaypoints`: Sorts waypoints alphabetically by name.
- `constructOutputJson`: Constructs output JSON from the processed waypoints.
- `processFile`: Core function that processes each individual file.
- `main`: Orchestrates the file processing pipeline.

This script has robust error handling, logging errors during XML to JSON conversion, JSON structure validation, and halting file processing if necessary.

## garmin-fpl-to-skydemon-fpl.js

This script converts Garmin FPL files (`.fpl`) from Garmin's proprietary XML format to SkyDemon's XML format (`.flightplan`). The conversion process involves reading XML content, validating its structure, extracting waypoints, and transforming them into a different format.

Key functions of this script include:

- `convertJsonToXml`: Converts a JSON object to an XML string.
- `extractWaypoints`: Extracts waypoints from the converted JSON.
- `constructOutputJson`: Constructs output JSON from the extracted waypoints.
- `processFile`: Core function that processes each individual file.
- `processFiles`: Processes all files in the input directory.
- `main`: Orchestrates the file processing pipeline.

This script also logs errors to the console if there are issues with file reading or writing, XML parsing, or JSON structure validation.

## csv-wpts-to-skydemon-wpts.js

This tool processes CSV files containing waypoints (with latitude, longitude, and name columns) and produces a SkyDemon compatible waypoint file (`.gpx`). The script performs several key functions:

- Converts CSV to JSON format.
- Extracts waypoints from the JSON structure.
- Removes any duplicate waypoints from the dataset.
- Sorts waypoints alphabetically based on their identifier (name).
- Constructs a SkyDemon-compatible XML structure and writes the result as a `.gpx` file.

Key functions of this script include:

- `convertCsvToJson`: Converts the CSV content into JSON format.
- `extractWaypoints`: Maps the CSV row entries into waypoint JSON objects.
- `removeDuplicates`: Filters out duplicate waypoints from the collection.
- `sortWaypoints`: Arranges waypoints in alphabetical order based on their name.
- `constructOutputJson`: Builds the final XML-structured JSON object for conversion to `.gpx` file.
- `processFile`: Handles the reading and initial processing of each CSV file.
- `processFiles`: Manages the processing of all CSV files in the given directory.
- `main`: Sets up and kicks off the entire file processing routine.

Errors encountered during the CSV parsing or file processing are logged to the console for debugging purposes.

## gpx-wpts-to-garmin-fpl.js

This tool transforms waypoints from GPX files (`.gpx`) to Garmin Flight Plan files (`.fpl`). It processes GPX waypoints, removing duplicates and sorting them alphabetically by name, before constructing them into a Garmin-compatible flight plan. This allows you to import waypoints into Garmin Pilot or Garmin G1000.

**Key functions of this script include**:

- `convertXmlToJson`: Transforms an XML GPX file to a JSON format.
- `isValidGpxJsonStructure`: Validates if a given JSON structure correctly represents a GPX file.
- `processFile`: Reads a file, validates its structure, and extracts waypoints.
- `constructOutputJson`: Constructs output JSON with waypoints in a Garmin FPL format.
- `removeDuplicateWaypoints`: Filters out duplicate waypoints based on their latitude, longitude, and name.
- `sortWaypoints`: Sorts waypoints alphabetically by their names.
- `processFiles`: Processes all GPX files in the specified directory, accumulating waypoints.
- `main`: Orchestrates the file processing pipeline.

To **use this tool**, run the following command:

```bash
node gpx-wpts-to-garmin-fpl.js [inputDirectory] [outputDirectory]
```

If no input and output directories are provided, it defaults to `./input` and `./output` respectively.

## Dependencies

The scripts rely on Node.js, `xml2js` library for XML and JSON conversions, and `papaparse` for parsing CSV. They also use a `utils.js` utility module providing helper functions for ensuring directory existence, file extension filtering, file reading and writing, and error logging. `stringToDecimalDegrees.js` is another utility module that converts string representations of latitude and longitude to decimal degrees.

### `utils.js`

The utility module includes the following key functions:

- `logError`: Logs error messages to the console.
- `readFile`: Reads a file asynchronously and returns its contents.
- `writeFile`: Writes content to a file asynchronously.
- `getInputFiles`: Retrieves a list of input files from a directory.
- `convertDd2DMS`: Converts decimal degrees to degrees, minutes, and seconds representation.
- `convertLatitude`: Converts latitude from decimal degrees to string format (degrees, minutes, seconds).
- `convertLongitude`: Converts longitude from decimal degrees to string format (degrees, minutes, seconds).
- `isValidGarminFplJsonStructure`: Validates the structure of a JSON object to ensure it has the required fields.
- `filterFilesByExtension`: Filters a list of files based on their extension.
- `ensureDirectoryExists`: Ensures a given directory exists.

### `stringToDecimalDegrees.js`

- `stringToDecimalDegrees`: Converts a string representation of latitude or longitude, that could be in various formats, to decimal degrees.

## Contributing

Your contributions are welcomed and appreciated. Please feel free to improve these tools by opening issues or submitting pull requests. All feedback and code improvements are valuable.

## Important Note

These scripts are designed to process input files with specific structures. If your input files do not adhere to the expected formats, the scripts may fail to work correctly. Always ensure your files are formatted correctly for the best results.
