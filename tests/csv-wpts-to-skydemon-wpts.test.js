import { assert, expect, test } from "vitest";
import path from "path";
import {
  constructOutputJson,
  convertCsvToJson,
  extractWaypoints,
  processFiles,
  removeDuplicates,
  sortWaypoints,
} from "../csv-wpts-to-skydemon-wpts";
import { readFile } from "../utils/utils";

// Test: convertCsvToJson function
test("convertCsvToJson converts CSV to JSON correctly", () => {
  const csv = `name,latitude,longitude\nWaypoint1,12.3456,-12.3456`;
  const result = convertCsvToJson(csv);
  const expected = [
    {
      name: "Waypoint1",
      latitude: 12.3456,
      longitude: -12.3456,
    },
  ];

  assert.deepStrictEqual(
    result,
    expected,
    "CSV should be converted to expected JSON format"
  );
});

// Test: extractWaypoints function
test("extractWaypoints extracts waypoints correctly", () => {
  const input = [
    {
      name: "Waypoint1",
      latitude: `12°20'45.36"N`,
      longitude: `12°20'45.36"W`,
    },
  ];
  const result = extractWaypoints(input);
  const expected = [
    {
      identifier: { _text: "Waypoint1" },
      lat: { _text: 12.345933333333335 },
      lon: { _text: -12.345933333333335 },
    },
  ];

  assert.deepStrictEqual(
    result,
    expected,
    "Waypoints should be extracted as expected"
  );
});

// Test: removeDuplicates function
test("removeDuplicates removes duplicate waypoints", () => {
  const waypoints = [
    { identifier: { _text: "A" }, lat: { _text: 1.23 }, lon: { _text: 4.56 } },
    { identifier: { _text: "A" }, lat: { _text: 1.23 }, lon: { _text: 4.56 } },
    { identifier: { _text: "B" }, lat: { _text: 2.34 }, lon: { _text: 5.67 } },
  ];
  const result = removeDuplicates(waypoints);
  const expected = [
    { identifier: { _text: "A" }, lat: { _text: 1.23 }, lon: { _text: 4.56 } },
    { identifier: { _text: "B" }, lat: { _text: 2.34 }, lon: { _text: 5.67 } },
  ];

  assert.deepStrictEqual(result, expected, "Duplicates should be removed");
});

// Test: sortWaypoints function
test("sortWaypoints sorts waypoints alphabetically", () => {
  const waypoints = [
    { identifier: { _text: "B" } },
    { identifier: { _text: "A" } },
  ];
  const result = sortWaypoints(waypoints);
  const expected = [
    { identifier: { _text: "A" } },
    { identifier: { _text: "B" } },
  ];

  assert.deepStrictEqual(
    result,
    expected,
    "Waypoints should be sorted alphabetically"
  );
});

// Test: constructOutputJson function
test("constructOutputJson constructs the output correctly", () => {
  const waypoints = [
    {
      identifier: { _text: "Waypoint1" },
      lat: { _text: 12.3456 },
      lon: { _text: -12.3456 },
    },
  ];
  const result = constructOutputJson(waypoints);
  const expected = {
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
      wpt: [
        {
          _attributes: { lat: 12.3456, lon: -12.3456 },
          name: { _text: "Waypoint1" },
          sym: { _text: "Circle" },
          extensions: {
            identifier: { _text: "" },
            category: { _text: "" },
          },
        },
      ],
    },
  };

  assert.deepStrictEqual(
    result,
    expected,
    "Output JSON should match expected structure"
  );
});

// Test: extractWaypoints with different coordinate types
test("extractWaypoints handles S and E coordinates correctly", () => {
  const input = [
    {
      name: "Waypoint1",
      latitude: `12°20'45.36"S`,
      longitude: `12°20'45.36"E`,
    },
  ];
  const result = extractWaypoints(input);
  const expected = [
    {
      identifier: { _text: "Waypoint1" },
      lat: { _text: -12.345933333333335 },
      lon: { _text: 12.345933333333335 },
    },
  ];

  assert.deepStrictEqual(
    result,
    expected,
    "Coordinates S and E should be interpreted correctly"
  );
});

// Test: sortWaypoints with non-English characters
test("sortWaypoints sorts waypoints with non-English characters", () => {
  const waypoints = [
    { identifier: { _text: "Áb" } },
    { identifier: { _text: "Ab" } },
  ];
  const result = sortWaypoints(waypoints);
  const expected = [
    { identifier: { _text: "Ab" } },
    { identifier: { _text: "Áb" } },
  ];

  assert.deepStrictEqual(
    result,
    expected,
    "Waypoints should be sorted considering non-English characters"
  );
});

test("should create an output file with the correct content", async () => {
  const inputDirectory = "./tests/test_input";
  const outputDirectory = "./tests/test_output";

  await processFiles(inputDirectory, outputDirectory);

  const outputFile = path.join(outputDirectory, "csv-waypoints.gpx");
  const content = await readFile(outputFile);

  const expectedContent = `<?xml version="1.0" encoding="utf-8"?>
<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="SkyDemon" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="52.907777777777774" lon="-1.4369444444444444">
    <name>T10T</name>
    <sym>Circle</sym>
    <extensions>
      <identifier></identifier>
      <category></category>
    </extensions>
  </wpt>
  <wpt lat="53.70305555555556" lon="-2.8983333333333334">
    <name>Test</name>
    <sym>Circle</sym>
    <extensions>
      <identifier></identifier>
      <category></category>
    </extensions>
  </wpt>
</gpx>`;

  expect(content).toEqual(expectedContent);
});
