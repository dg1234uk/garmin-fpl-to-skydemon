import { assert, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  readFile,
  convertDd2DMS,
  convertLatitude,
  convertLongitude,
  isValidGarminFplJsonStructure,
  ensureDirectoryExists,
} from '../utils/utils.js';
import {
  extractWaypoints,
  constructOutputJson,
  processFile,
} from '../garmin-fpl-to-skydemon-fpl';

// Test: readFile function with a valid file
test('readFile reads file correctly', async () => {
  const content = await readFile('./tests/test_input/test.fpl');
  assert.strictEqual(
    typeof content,
    'string',
    'Content should be of type string'
  );
});

// Test: readFile function with an invalid file
test('readFile handles error for non-existing file', async () => {
  const content = await readFile('./path_to_non_existing_file');
  assert.strictEqual(
    content,
    null,
    'Content should be null for non-existing file'
  );
});

// Test: Convert Latitude function
test('convertLatitude formats latitude correctly', () => {
  const latitude = 40.712776;
  const formatted = convertLatitude(latitude);
  assert.strictEqual(
    formatted,
    'N404245.99',
    'Latitude should be formatted as N404245.99'
  );
});

// Test: Convert Latitude function
test('convertLatitude formats - boundary value correctly', () => {
  const latitude = -90;
  const formatted = convertLatitude(latitude);
  assert.strictEqual(
    formatted,
    'S900000.00',
    'Latitude should be formatted as S900000.00'
  );
});

// Test: Convert Latitude function
test('convertLatitude formats + boundary value correctly', () => {
  const latitude = +90;
  const formatted = convertLatitude(latitude);
  assert.strictEqual(
    formatted,
    'N900000.00',
    'Latitude should be formatted as N900000.00'
  );
});

// Test: Convert Latitude function
test('convertLatitude handles error for invalid values', () => {
  const latitude = 90.712776;
  const formatted = convertLatitude(latitude);
  assert.strictEqual(formatted, null, 'Latitude should be null');
});

// Test: Convert Latitude function
test('convertLatitude handles error for invalid values', () => {
  const latitude = -100.392;
  const formatted = convertLatitude(latitude);
  assert.strictEqual(formatted, null, 'Latitude should be null');
});

// Test: Convert Longitude function
test('convertLongitude formats longitude correctly', () => {
  const longitude = -74.005974;
  const formatted = convertLongitude(longitude);
  assert.strictEqual(
    formatted,
    'W0740021.51',
    'Longitude should be formatted as W0740021.51'
  );
});

// Test: Convert Longitude function
test('convertLongitude formats - boundary value correctly', () => {
  const longitude = -180;
  const formatted = convertLongitude(longitude);
  assert.strictEqual(
    formatted,
    'W1800000.00',
    'Longitude should be formatted as W1800000.00'
  );
});

// Test: Convert Longitude function
test('convertLongitude formats + boundary value correctly', () => {
  const longitude = +180;
  const formatted = convertLongitude(longitude);
  assert.strictEqual(
    formatted,
    'E1800000.00',
    'Longitude should be formatted as E1800000.00'
  );
});

// Test: Convert Longitude function
test('convertLongitude handles error for invalid values', () => {
  const longitude = -180.005974;
  const formatted = convertLongitude(longitude);
  assert.strictEqual(formatted, null, 'Longitude should be null');
});

// Test: Convert Longitude function
test('convertLongitude handles error for invalid values', () => {
  const longitude = 181.974;
  const formatted = convertLongitude(longitude);
  assert.strictEqual(formatted, null, 'Longitude should be null');
});

// Test: convertDd2DMS function
test('convertDd2DMS converts decimal degrees to DMS correctly', () => {
  const decimalDegrees = 45.6789;
  const { degree, minute, second } = convertDd2DMS(decimalDegrees);

  assert.strictEqual(degree, 45, 'Degree should be 45');
  assert.strictEqual(minute, 40, 'Minute should be 40');
  assert.ok(
    Math.abs(second - 44.04) < 0.01,
    'Second should be approximately 44.04'
  );
});

// Test: isValidJsonStructure function
test('isValidJsonStructure validates JSON structure', () => {
  const validJson = {
    'flight-plan': {
      'waypoint-table': {
        waypoint: [],
      },
      route: {
        'route-point': [],
      },
    },
  };

  const invalidJson = {
    'something-else': {},
  };

  assert.strictEqual(
    isValidGarminFplJsonStructure(validJson),
    true,
    'Should be true for valid JSON structure'
  );
  assert.strictEqual(
    isValidGarminFplJsonStructure(invalidJson),
    false,
    'Should be false for invalid JSON structure'
  );
});

test('should return false for null input', () => {
  expect(isValidGarminFplJsonStructure(null)).toBe(false);
});

test('should return false for empty object', () => {
  expect(isValidGarminFplJsonStructure({})).toBe(false);
});

test('should return false for missing flight-plan', () => {
  expect(isValidGarminFplJsonStructure({ randomKey: {} })).toBe(false);
});

test('should return false for missing route in flight-plan', () => {
  expect(isValidGarminFplJsonStructure({ 'flight-plan': {} })).toBe(false);
});

test('should return false for missing route-point in flight-plan route', () => {
  expect(isValidGarminFplJsonStructure({ 'flight-plan': { route: {} } })).toBe(
    false
  );
});

test('should return false for missing waypoint-table in flight-plan', () => {
  expect(
    isValidGarminFplJsonStructure({
      'flight-plan': { route: { 'route-point': [] } },
    })
  ).toBe(false);
});

test('should return false for missing waypoint in waypoint-table', () => {
  expect(
    isValidGarminFplJsonStructure({
      'flight-plan': { 'waypoint-table': {}, route: { 'route-point': [] } },
    })
  ).toBe(false);
});

test('should return false for non-array waypoint', () => {
  expect(
    isValidGarminFplJsonStructure({
      'flight-plan': {
        'waypoint-table': { waypoint: {} },
        route: { 'route-point': [] },
      },
    })
  ).toBe(false);
});

test('should return false for non-array route-point', () => {
  expect(
    isValidGarminFplJsonStructure({
      'flight-plan': {
        'waypoint-table': { waypoint: [] },
        route: { 'route-point': {} },
      },
    })
  ).toBe(false);
});

test('should return true for valid input structure', () => {
  const validInput = {
    'flight-plan': {
      route: {
        'route-point': [],
      },
      'waypoint-table': {
        waypoint: [],
      },
    },
  };
  expect(isValidGarminFplJsonStructure(validInput)).toBe(true);
});

// Test: extractWaypoints function
test('extractWaypoints extracts waypoints from JSON', () => {
  const inputJson = {
    'flight-plan': {
      route: {
        'route-point': [{ 'waypoint-identifier': { _text: 'A' } }],
      },
      'waypoint-table': {
        waypoint: [
          {
            identifier: { _text: 'A' },
            lat: { _text: '40' },
            lon: { _text: '-70' },
          },
        ],
      },
    },
  };

  const waypoints = extractWaypoints(inputJson);
  assert.ok(Array.isArray(waypoints), 'Waypoints should be an array');
  assert.strictEqual(
    waypoints.length,
    1,
    'Waypoints array should have 1 element'
  );
});

// Test: constructOutputJson function
test('constructOutputJson constructs output JSON correctly', () => {
  const waypoints = ['N401227.66 W0740021.51'];
  const outputJson = constructOutputJson(waypoints);
  assert.ok(
    outputJson.DivelementsFlightPlanner,
    'Output JSON should have DivelementsFlightPlanner property'
  );
  assert.ok(
    outputJson.DivelementsFlightPlanner.PrimaryRoute,
    'DivelementsFlightPlanner should have PrimaryRoute property'
  );
});

// Test: ensureDirectoryExists function
test('ensureDirectoryExists ensures the directory exists or creates it', async () => {
  const testDir = './test_input2';
  await ensureDirectoryExists(testDir, true);

  // Check if the directory was created
  const stats = await fs.promises.stat(testDir);
  assert.ok(stats.isDirectory(), 'Should have created the directory');

  // Cleanup: remove the directory
  await fs.promises.rmdir(testDir);
});

// Test: processFile function
test('processFile processes a file correctly', async () => {
  const inputDirectory = './tests/test_input';
  const outputDirectory = './tests/test_output';
  const file = 'test.fpl';

  await processFile(inputDirectory, outputDirectory, file);

  const outputFile = path.join(outputDirectory, 'test.flightplan');
  const stats = await fs.promises.stat(outputFile);

  assert.ok(stats.isFile(), 'Output file should be created');
});

test('should create an output file with the correct content', async () => {
  const inputDirectory = './tests/test_input';
  const outputDirectory = './tests/test_output';
  const file = 'test.fpl';

  await processFile(inputDirectory, outputDirectory, file);

  const outputFile = path.join(outputDirectory, 'test.flightplan');
  const content = await fs.promises.readFile(outputFile, 'utf8');

  const expectedContent = `<?xml version="1.0" encoding="utf-8"?>
<DivelementsFlightPlanner>
  <PrimaryRoute CourseType="GreatCircle" Start="N535022.56 W0024742.72" Level="3000" Rules="Vfr" PlannedFuel="1.000000">
    <RhumbLineRoute To="N534748.84 W0024323.88" Level="MSL" LevelChange="B"/>
    <RhumbLineRoute To="N534419.68 W0024149.92" Level="MSL" LevelChange="B"/>
    <RhumbLineRoute To="N535022.56 W0024742.72" Level="MSL" LevelChange="B"/>
    <ReferencedAirfields/>
  </PrimaryRoute>
</DivelementsFlightPlanner>`;

  expect(content).toEqual(expectedContent);
});
