# README for Flight Plan File Processor

## Overview

This script is specifically designed to process Garmin flight plan files with the .fpl extension, converting them from Garmin's proprietary XML format to SkyDemon's XML format (.flightplan). The conversion involves reading XML content, validating the structure, extracting waypoints, and transforming them into a different format. The script is written in JavaScript and is intended to be executed using Node.js.

## How It Works

1. The script reads Garin flight plan (.fpl) files from a specified input directory. By default, it looks for files in the `./input` directory.
2. For each file, it reads the XML content and converts it to a JSON representation.
3. It then validates the structure of the JSON to ensure it contains the expected fields.
4. It extracts waypoints from the JSON, converting latitude and longitude from decimal degrees to a string representation in degrees, minutes, and seconds.
5. The script constructs a new JSON structure with the extracted waypoints and converts it to SkyDemon XML format.
6. The newly constructed SkyDemon XML is then saved to a specified output directory. By default, it uses the `./output` directory.

## Dependencies

- Node.js: Make sure you have Node.js installed on your system.
- xml2js: This library is used to convert between XML and JSON formats.

## Usage

1. First, ensure that Node.js is installed on your system.
2. Install the `xml2js` package using npm:
   ```
   npm install xml2js
   ```
3. Place the input files (with `.fpl` extension) in the input directory (default is `./input`).
4. Run the script:
   ```
   node <path_to_script/garmin-fpl-to-skydemon.js>
   ```
   Optionally, you can specify custom input and output directories:
   ```
   node <path_to_script/garmin-fpl-to-skydemon.js> <input_directory> <output_directory>
   ```
5. The processed files will be saved in the output directory (default is `./output`) with the `.flightplan` extension.

## Functions Description

- `logError`: Helper function to log error messages to the console.
- `readFile`: Asynchronously reads a file and returns its contents.
- `writeFile`: Asynchronously writes content to a file.
- `convertDd2DMS`: Converts decimal degrees to degrees, minutes, and seconds representation.
- `convertLatitude`: Converts latitude in decimal degrees to string format (degrees, minutes, seconds).
- `convertLongitude`: Converts longitude in decimal degrees to string format (degrees, minutes, seconds).
- `isValidJsonStructure`: Validates the JSON structure to ensure it has the expected fields.
- `extractWaypoints`: Extracts waypoints from the input JSON structure.
- `constructOutputJson`: Constructs the output JSON structure from the extracted waypoints.
- `convertJsonToXml`: Converts a JSON object to an XML string.
- `ensureDirectoryExists`: Ensures that the specified directory exists.
- `getInputFiles`: Gets a list of input files from a directory.
- `processFile`: Core function to process an individual file.
- `main`: Main function that starts the file processing.

## Error Handling

The script logs errors to the console if there is an issue reading or writing files, if the input XML cannot be parsed, or if the JSON structure is not as expected.

## Note

This script assumes that the input files have a specific structure. If the input files are not formatted as expected, the script may not work correctly.
