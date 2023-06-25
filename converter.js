import fs from 'fs';
import xml2js from 'xml-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// specify the file path here
// const xmlFilePath = 'Ph3-Arcs.fpl';

// Ask the user for the input file
rl.question('Enter the name of the input XML file: ', (inputFile) => {
  // Read the input XML from a file
  fs.readFile(inputFile, 'utf8', (err, inputXml) => {
    if (err) {
      console.error(`Error reading the file: ${err}`);
      return;
    }

    // Convert the input XML to JSON
    const inputJson = JSON.parse(xml2js.xml2json(inputXml, { compact: true }));

    // Extract necessary data
    const waypoints = inputJson['flight-plan']['waypoint-table'][
      'waypoint'
    ].map((waypoint) => {
      const lat = parseFloat(waypoint['lat']['_text']);
      const lon = parseFloat(waypoint['lon']['_text']);

      const latDegree = Math.floor(lat);
      const latMinute = Math.floor((lat - latDegree) * 60);
      const latSecond = ((lat - latDegree) * 60 - latMinute) * 60;
      const latDirection = lat >= 0 ? 'N' : 'S';

      const lonDegree = Math.floor(Math.abs(lon));
      const lonMinute = Math.floor((Math.abs(lon) - lonDegree) * 60);
      const lonSecond = ((Math.abs(lon) - lonDegree) * 60 - lonMinute) * 60;
      const lonDirection = lon >= 0 ? 'E' : 'W';

      const latString = `${latDirection}${latDegree
        .toString()
        .padStart(2, '0')}${latMinute.toString().padStart(2, '0')}${latSecond
        .toFixed(2)
        .toString()
        .padStart(5, '0')}`;
      console.log(latString);
      const lonString = `${lonDirection}${lonDegree
        .toString()
        .padStart(3, '0')}${lonMinute.toString().padStart(2, '0')}${lonSecond
        .toFixed(2)
        .toString()
        .padStart(2, '0')}`;

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

    // Output the transformed XML
    console.log(outputXml);

    const outputFile = 'output/convertedOutput.flightplan';

    // Optionally, write the XML to an output file
    fs.writeFile(outputFile, outputXml, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing the file: ${err}`);
      } else {
        console.log(
          'Converted XML output has been saved to convertedOutput.xml'
        );
      }
    });
  });
  rl.close();
});
