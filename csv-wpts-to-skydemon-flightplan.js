import Papa from "papaparse";
import {
  constructOutputFilePath,
  convertLatitude,
  convertLongitude,
  ensureDirectoryExists,
  isValidExtensionFile,
  logError,
  readFile,
  writeFile,
} from "./utils/utils.js";
import { stringToDecimalDegrees } from "./utils/stringToDecimalDegrees.js";

// const DEFAULT_INPUT_DIRECTORY = "./input";
const DEFAULT_OUTPUT_DIRECTORY = "./output";

// Convert CSV to JSON
function convertCsvToJson(inputCsv) {
  const results = Papa.parse(inputCsv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (results.errors.length) {
    logError("Error parsing the CSV:", results.errors);
    return null;
  }
  return results.data;
}

// Extracts waypoints from input JSON
function extractWaypoints(inputJson) {
  const waypoints = inputJson.map((item) => {
    const DdLat = stringToDecimalDegrees(String(item.latitude));
    const DdLon = stringToDecimalDegrees(String(item.longitude));
    return {
      lat: { _text: convertLatitude(DdLat) },
      lon: { _text: convertLongitude(DdLon) },
      identifier: { _text: item.name },
    };
  });
  if (waypoints.length === 0) {
    logError("No waypoints found in the input file");
  }
  return waypoints;
}

// Converts input CSV string to JSON
function convertInputCsvToJson(inputCsv) {
  if (!inputCsv) return [];
  return convertCsvToJson(inputCsv);
}

function convertToSkyDemonFlightPlan(waypoints) {
  const xmlHeader = '<?xml version="1.0" encoding="utf-8"?>';
  const DivelemntsFlightPlannerOpen = `<DivelementsFlightPlanner>`;
  const DivelementsFlightPlannerClose = `</DivelementsFlightPlanner>`;
  const aircraft = `<Aircraft AirframeType="Aeroplane" MinimumRunwayLengthMetres="400" Name="Diamond DA 42-VI" Registration="GOTST" HexCode="407FD9" FuelType="JetA" AlternateFuelType="JetA" FuelMeasurementType="Volume" FuelMeasurementVolumeType="USGallons" FuelMeasurementMassType="Kilograms" TaxiFuel="0.100000" LandingFuel="0.100000" MaxFuel="189.300000" WeightBalanceType="Standard" EmptyWeight="1498.100000" MaximumWeight="1900.007719" EmptyArmLon="2.42" EmptyArmLat="0.00" Type="DA42" ColourMarkings="WHITE" ServiceCeiling="18000" Equipment1="BDFGLORVYZ" Equipment2="SB2" OtherCommsEquipment="" OtherNavEquipment="ABAS" PbnEquipment="A1B2C2D2O2S1" FuelContingency="0.05" HoldingMinutes="45" HourlyCost="140" HourlyCostIncludesFuel="True" GlideAirspeed="84.00" GlideRatio="12.00" DefaultLevel="3500" EnvelopeType="DatumDistance" Envelope="2.35,1450.000000,2.35,1468.000000,2.43,1999.000000,2.48,1999.000000,2.48,1700.000000,2.45,1450.000000">
    <ClimbProfile FpmSL="1110.000000" FpmSC="1050.000000" IndicatedAirspeed="90.000000" FuelBurnSL="62.837836" FuelBurnSC="58.673883" />
    <DescentProfile Fpm="-700.000000" IndicatedAirspeed="140.000000" FuelBurn="26.497883" />
    <CruiseProfiles>
      <CruiseProfile Name="60 %" AirspeedType="True" FuelBurn="38.989741" IndicatedAirspeed="139.000000" Airspeed="139.000000">
        <Entry Level="2000" Airspeed="139.000000" FuelBurn="38.989741" />
        <Entry Level="4000" Airspeed="142.000000" FuelBurn="38.989741" />
        <Entry Level="6000" Airspeed="144.000000" FuelBurn="38.989741" />
        <Entry Level="8000" Airspeed="147.000000" FuelBurn="38.989741" />
        <Entry Level="10000" Airspeed="150.000000" FuelBurn="38.989741" />
      </CruiseProfile>
    </CruiseProfiles>
    <LoadingPoints>
      <FuelLoadingPoint Name="Main Fuel Tanks" LeverArm="2.63" LeverArmLat="0.00" DefaultValue="189.27" Capacity="189.30" />
      <LoadingPoint Name="Pilot" LeverArm="2.30" LeverArmLat="0.00" DefaultValue="85.00" />
      <LoadingPoint Name="Front Pax" LeverArm="2.30" LeverArmLat="0.00" DefaultValue="0.00" />
      <LoadingPoint Name="Rear Pax 1" LeverArm="3.25" LeverArmLat="0.00" DefaultValue="0.00" />
      <LoadingPoint Name="Rear Pax 2" LeverArm="3.25" LeverArmLat="0.00" DefaultValue="0.00" />
      <LoadingPoint Name="Nose Bagg (max 30kg)" LeverArm="0.60" LeverArmLat="0.00" DefaultValue="0.00" />
      <LoadingPoint Name="Cabin Bagg (max 45kg)" LeverArm="3.89" LeverArmLat="0.00" DefaultValue="0.00" />
      <LoadingPoint Name="Bagg Extn (max 18kg)" LeverArm="4.54" LeverArmLat="0.00" DefaultValue="0.00" />
      <LoadingPoint Name="De-icing (max 33kg)" LeverArm="1.00" LeverArmLat="0.00" DefaultValue="16.50" />
      <FuelLoadingPoint Name="Aux Fuel Tanks" LeverArm="3.20" LeverArmLat="0.00" DefaultValue="0.00" Capacity="99.93" />
    </LoadingPoints>
  </Aircraft>`;
  const primaryRouteOpen = `<PrimaryRoute CourseType="GreatCircle" Start="${waypoints[0].lat._text} ${waypoints[0].lon._text}" Level="3500" CruiseProfile="60 %" Rules="Vfr" PlannedFuel="189.270000">`;
  const primaryRouteClose = `</PrimaryRoute>`;
  const rhumbLineRoute = waypoints
    .slice(1)
    .map(
      (waypoint) =>
        `<RhumbLineRoute To="${waypoint.lat._text} ${waypoint.lon._text}" Level="MSL" LevelChange="B"/>`
    );
  const weightBalance = `<WeightBalance>
      <LoadingPoint Name="Main Fuel Tanks" Weight="189.27" />
      <LoadingPoint Name="Pilot" Weight="85.00" />
      <LoadingPoint Name="Front Pax" Weight="0.00" />
      <LoadingPoint Name="Rear Pax 1" Weight="0.00" />
      <LoadingPoint Name="Rear Pax 2" Weight="0.00" />
      <LoadingPoint Name="Nose Bagg (max 30kg)" Weight="0.00" />
      <LoadingPoint Name="Cabin Bagg (max 45kg)" Weight="0.00" />
      <LoadingPoint Name="Bagg Extn (max 18kg)" Weight="0.00" />
      <LoadingPoint Name="De-icing (max 33kg)" Weight="16.50" />
      <LoadingPoint Name="Aux Fuel Tanks" Weight="0.00" />
    </WeightBalance>`;
  const referenceAirfields = `<ReferencedAirfields />`;

  const flightPlan = `${xmlHeader}
  ${DivelemntsFlightPlannerOpen}
    ${aircraft}
    ${primaryRouteOpen}
      ${rhumbLineRoute.join("\n")}
    ${primaryRouteClose}
    ${weightBalance}
    ${referenceAirfields}
  ${DivelementsFlightPlannerClose}`;

  return flightPlan;
}

async function processFile(inputFilePath, outputFilePath) {
  const inputCsv = await readFile(inputFilePath);

  const inputJson = convertInputCsvToJson(inputCsv);

  // Extract waypoints
  const waypoints = extractWaypoints(inputJson);

  const flightplan = convertToSkyDemonFlightPlan(waypoints);
  await writeFile(outputFilePath, flightplan);
}

// Main function to start the file processing
async function main() {
  const [inputFilePath, outputDirectory = DEFAULT_OUTPUT_DIRECTORY] =
    process.argv.slice(2);

  isValidExtensionFile(inputFilePath, "csv");
  await ensureDirectoryExists(outputDirectory, true);

  const outputFilePath = constructOutputFilePath(
    inputFilePath,
    outputDirectory,
    "flightplan"
  );

  await processFile(inputFilePath, outputFilePath);
}

// Start the program and catch any top-level errors
main().catch((err) => {
  const errorMessage = err.message || "An unknown error occurred";
  logError("An error occurred:", errorMessage);
});
