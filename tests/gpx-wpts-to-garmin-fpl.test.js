import { assert, expect, test } from "vitest";
import path from "path";
import {
  convertXmlToJson,
  isValidGpxJsonStructure,
  processFiles,
  removeDuplicateWaypoints,
  sortWaypoints,
} from "../gpx-wpts-to-garmin-fpl";
import { readFile } from "../utils/utils";

// convertXmlToJson tests
test("convertXmlToJson converts valid XML to JSON", () => {
  const xml =
    "<test><to>Garmin</to><from>GPX</from><body>Let's convert!</body></test>";
  const json = convertXmlToJson(xml);
  assert.deepStrictEqual(json.test, {
    to: { _text: "Garmin" },
    from: { _text: "GPX" },
    body: { _text: "Let's convert!" },
  });
});

test("convertXmlToJson logs error for invalid XML and returns null", () => {
  const invalidXml = "<test><to>Garmin</to><from>GPX</from></test";
  const json = convertXmlToJson(invalidXml);
  assert.strictEqual(json, null);
});

// isValidGpxJsonStructure tests
test("isValidGpxJsonStructure validates a correct GPX JSON structure", () => {
  const json = {
    gpx: {
      wpt: [{ _attributes: { lat: "1", lon: "2" }, name: { _text: "pointA" } }],
    },
  };
  assert.strictEqual(isValidGpxJsonStructure(json), true);
});

test("isValidGpxJsonStructure returns false for missing 'gpx' key", () => {
  const json = {};
  assert.strictEqual(isValidGpxJsonStructure(json), false);
});

test("isValidGpxJsonStructure returns false for missing waypoints", () => {
  const json = { gpx: {} };
  assert.strictEqual(isValidGpxJsonStructure(json), false);
});

// removeDuplicateWaypoints tests
test("removeDuplicateWaypoints removes duplicate waypoints", () => {
  const waypoints = [
    { _attributes: { lat: "1", lon: "2" }, name: { _text: "pointA" } },
    { _attributes: { lat: "1", lon: "2" }, name: { _text: "pointA" } },
  ];
  const result = removeDuplicateWaypoints(waypoints);
  assert.strictEqual(result.length, 1);
});

// sortWaypoints tests
test("sortWaypoints sorts waypoints alphabetically", () => {
  const waypoints = [
    { name: { _text: "pointB" } },
    { name: { _text: "pointA" } },
  ];
  const result = sortWaypoints(waypoints);
  const expected = [
    { name: { _text: "pointA" } },
    { name: { _text: "pointB" } },
  ];
  assert.deepStrictEqual(result, expected);
});

test("should create an output file with the correct content", async () => {
  const inputDirectory = "./tests/test_input";
  const outputDirectory = "./tests/test_output";

  await processFiles(inputDirectory, outputDirectory);

  const outputFile = path.join(outputDirectory, "waypoints-fpl.fpl");
  const content = await readFile(outputFile);

  const expectedContent = `<?xml version="1.0" encoding="utf-8"?>
<flight-plan xmlns="http://www8.garmin.com/xmlschemas/FlightPlan/v1">
  <created>2023-09-03T15:58:28.932Z</created>
  <waypoint-table>
    <waypoint>
      <identifier>A</identifier>
      <type>USER WAYPOINT</type>
      <country-code>__</country-code>
      <lat>53.23</lat>
      <lon>-2.23</lon>
      <comment></comment>
    </waypoint>
    <waypoint>
      <identifier>DAN01</identifier>
      <type>USER WAYPOINT</type>
      <country-code>__</country-code>
      <lat>53.43</lat>
      <lon>-2.93</lon>
      <comment></comment>
    </waypoint>
  </waypoint-table>
  <route>
    <route-name>Waypoints</route-name>
    <flight-plan-index>1</flight-plan-index>
    <route-point>
      <waypoint-identifier>A</waypoint-identifier>
      <waypoint-type>USER WAYPOINT</waypoint-type>
      <waypoint-country-code>__</waypoint-country-code>
    </route-point>
    <route-point>
      <waypoint-identifier>DAN01</waypoint-identifier>
      <waypoint-type>USER WAYPOINT</waypoint-type>
      <waypoint-country-code>__</waypoint-country-code>
    </route-point>
  </route>
</flight-plan>`;

  const dateRegex = /<created>.*<\/created>/;
  expect(content).toMatch(dateRegex);

  const withoutDateContent = content.replace(
    dateRegex,
    "<created>REPLACED_DATE</created>"
  );
  const expectedWithoutDateContent = expectedContent.replace(
    dateRegex,
    "<created>REPLACED_DATE</created>"
  );

  expect(withoutDateContent).toEqual(expectedWithoutDateContent);
});
