// const fs = require('fs');
// const xml2js = require('xml-js');
// const path = require('path');

import fs from 'fs';
import xml2js from 'xml-js';
import path from 'path';

const inputDirectory = './input'; // specify the input directory containing the XML files

function convertDd2DMS(Dd) {
  const degree = Math.floor(Dd);
  const minute = Math.floor((Dd - degree) * 60);
  const second = ((Dd - degree) * 60 - minute) * 60;

  return { degree, minute, second };
}

// Helper functions for conversion
function convertLatitude(lat) {
  const {
    degree: latDegree,
    minute: latMinute,
    second: latSecond,
  } = convertDd2DMS(lat);
  const latDirection = lat >= 0 ? 'N' : 'S';

  const latString = `${latDirection}${latDegree
    .toString()
    .padStart(2, '0')}${latMinute.toString().padStart(2, '0')}${latSecond
    .toFixed(2)
    .toString()
    .padStart(5, '0')}`;
  return latString;
}

function convertLongitude(lon) {
  const {
    degree: lonDegree,
    minute: lonMinute,
    second: lonSecond,
  } = convertDd2DMS(lon);
  const lonDirection = lon >= 0 ? 'E' : 'W';
  const lonString = `${lonDirection}${lonDegree
    .toString()
    .padStart(3, '0')}${lonMinute.toString().padStart(2, '0')}${lonSecond
    .toFixed(2)
    .toString()
    .padStart(5, '0')}`;
  return lonString;
}

fs.readdir(inputDirectory, (err, files) => {
  if (err) {
    console.error(`Error reading directory: ${err}`);
    return;
  }

  files.forEach((file) => {
    const inputFile = path.join(inputDirectory, file);

    // Read the input XML from a file
    fs.readFile(inputFile, 'utf8', (err, inputXml) => {
      if (err) {
        console.error(`Error reading the file: ${err}`);
        return;
      }

      // Convert the input XML to JSON
      const inputJson = JSON.parse(
        xml2js.xml2json(inputXml, { compact: true })
      );

      // Extract necessary data
      const waypoints = inputJson['flight-plan']['waypoint-table'][
        'waypoint'
      ].map((waypoint) => {
        const lat = parseFloat(waypoint['lat']['_text']);
        const lon = parseFloat(waypoint['lon']['_text']);

        const latString = convertLatitude(lat);
        const lonString = convertLongitude(lon);

        return `${latString} ${lonString}`;
      });

      // Construct the output JSON object
      const outputJson = {
        DivelementsFlightPlanner: {
          PrimaryRoute: {
            _attributes: {
              CourseType: 'GreatCircle',
              Start: waypoints[0],
              Level: '3000',
              // CruiseProfile: '60 %',
              // Time: '133316352000000000',
              Rules: 'Vfr',
              PlannedFuel: '1.000000',
            },
            RhumbLineRoute: waypoints.slice(1).map((to) => ({
              _attributes: { To: to, Level: 'MSL', LevelChange: 'B' },
            })),
            ReferencedAirfields: {},
          },
        },
      };

      // Convert the output JSON back to XML
      const outputXml =
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        xml2js.json2xml(outputJson, { compact: true, spaces: 2 });

      const outputFilePath = path.join(
        './output',
        path.basename(file, path.extname(file)) + '.flightplan'
      );

      // Optionally, write the XML to an output file
      fs.writeFile(outputFilePath, outputXml, 'utf8', (err) => {
        if (err) {
          console.error(`Error writing the file: ${err}`);
        } else {
          console.log(
            `Converted XML output has been saved to ${outputFilePath}`
          );
        }
      });
    });
  });
});
