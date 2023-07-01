import { test, expect } from "vitest";
import path from "path";
import * as wpts from "../garmin-fpl-to-skydemon-wpts";
import { readFile } from "../utils/utils";

const sampleXml = await readFile("./tests/test_input/test.fpl");

test("convertXmlToJson converts XML to JSON correctly", ({ expect: ex }) => {
  const result = wpts.convertXmlToJson(sampleXml, "sample.fpl");
  ex(result).toBeInstanceOf(Object);
});

test("extractWaypoints extracts waypoints correctly", ({ expect: ex }) => {
  const json = wpts.convertXmlToJson(sampleXml, "sample.fpl");
  const waypoints = wpts.extractWaypoints(json);
  ex(waypoints).toBeInstanceOf(Array);
  ex(waypoints.length).toBeGreaterThan(0);
});

test("removeDuplicates removes duplicate waypoints", ({ expect: ex }) => {
  const waypoints = [
    { identifier: { _text: "WP1" } },
    { identifier: { _text: "WP1" } },
    { identifier: { _text: "WP2" } },
  ];
  const uniqueWaypoints = wpts.removeDuplicates(waypoints);
  ex(uniqueWaypoints.length).toBe(2);
});

test("sortWaypoints sorts waypoints alphabetically", ({ expect: ex }) => {
  const waypoints = [
    { identifier: { _text: "WP2" } },
    { identifier: { _text: "WP1" } },
    { identifier: { _text: "WP3" } },
  ];
  const sortedWaypoints = wpts.sortWaypoints(waypoints);
  ex(sortedWaypoints[0].identifier._text).toBe("WP1");
  ex(sortedWaypoints[1].identifier._text).toBe("WP2");
  ex(sortedWaypoints[2].identifier._text).toBe("WP3");
});

test("constructOutputJson constructs the output JSON correctly", ({
  expect: ex,
}) => {
  const waypoints = [
    {
      identifier: { _text: "WP1" },
      lat: { _text: "51.5074" },
      lon: { _text: "0.1278" },
    },
  ];
  const output = wpts.constructOutputJson(waypoints);
  ex(output).toBeInstanceOf(Object);
  ex(output.gpx.wpt.length).toBe(1);
  ex(output.gpx.wpt[0]._attributes.lat).toBe("51.5074");
  ex(output.gpx.wpt[0]._attributes.lon).toBe("0.1278");
  ex(output.gpx.wpt[0].name._text).toBe("WP1");
});

test("should create an output file with the correct content", async () => {
  const inputDirectory = "./tests/test_input";
  const outputDirectory = "./tests/test_output";
  const file = "test.fpl";

  await wpts.processFiles(inputDirectory, outputDirectory, file);

  const outputFile = path.join(outputDirectory, "waypoints.gpx");
  const content = await readFile(outputFile);

  const expectedContent = `<?xml version="1.0" encoding="utf-8"?>
<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="SkyDemon" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="53.8396" lon="-2.7952">
    <name>A01</name>
    <sym>Circle</sym>
    <extensions>
      <identifier></identifier>
      <category></category>
    </extensions>
  </wpt>
  <wpt lat="53.7969" lon="-2.7233">
    <name>A02</name>
    <sym>Circle</sym>
    <extensions>
      <identifier></identifier>
      <category></category>
    </extensions>
  </wpt>
  <wpt lat="53.7388" lon="-2.6972">
    <name>A03</name>
    <sym>Circle</sym>
    <extensions>
      <identifier></identifier>
      <category></category>
    </extensions>
  </wpt>
</gpx>`;

  expect(content).toEqual(expectedContent);
});
