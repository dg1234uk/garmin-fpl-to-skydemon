const fs = require('fs');
const xml2js = require('xml-js');

// specify the file path here
const xmlFilePath = 'Ph3-Arcs.fpl';

// read XML file
fs.readFile(xmlFilePath, 'utf8', (err, xmlString) => {
  if (err) {
    console.error(`Error reading the file: ${err}`);
    return;
  }

  // convert XML string to JSON
  const json = xml2js.xml2json(xmlString, { compact: true, spaces: 2 });

  // print JSON
  console.log(json);

  // optionally, you can write the JSON string to a file
  const outputFilePath = 'output.json';
  fs.writeFile(outputFilePath, json, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing the file: ${err}`);
    } else {
      console.log(`JSON output has been saved to ${outputFilePath}`);
    }
  });
});
