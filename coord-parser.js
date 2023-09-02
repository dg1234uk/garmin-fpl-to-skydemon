function toDecimalDegrees(coord) {
  // Check if coord is string
  if (typeof coord !== "string") return null;

  const coordCleaned = coord.trim();

  // Check for Direction (NSEW or + -)
  const directionRegex = /^[NSEW]|([NSEW])$/i;

  const matched = coordCleaned.match(directionRegex);
  let nsew = null;
  let direction = 1;
  if (matched) {
    nsew = matched[0].toUpperCase(); // return the matched direction in uppercase
    if (nsew === "S" || nsew === "W") direction = -1;
  } else if (coordCleaned.match(/^[+-]/)) {
    if (coordCleaned.match(/^[+-]/)[0] === "-") direction = -1;
  }

  const coordStripped = coordCleaned.replace(/[NSEW]/gi, "");

  function setDecimal(value) {
    let decimal = Number(".".concat(value));
    if (Number.isNaN(decimal)) {
      decimal = 0;
    }
    return decimal;
  }

  // If separtors split into sequences
  let parts;
  if (coordStripped.match(/[^0-9.]/)) {
    const groups = coordStripped.split(/[^0-9.]+/);
    const [degrees, minutes, seconds] = groups;
    parts = [Number(degrees), Number(minutes), Number(seconds)];
  } else {
    const [integerPart, decimalPart] = coordStripped.split(".");
    if (integerPart.length === 7) {
      // Longitude DMS.s format dddmmss
      const degrees = Number(integerPart.slice(0, 3));
      const minutes = Number(integerPart.slice(3, 5));
      const seconds = Number(integerPart.slice(5, 7)) + setDecimal(decimalPart);
      parts = [degrees, minutes, seconds];
    } else if (integerPart.length === 6) {
      // Latitude DMS.s format ddmmss
      const degrees = Number(integerPart.slice(0, 2));
      const minutes = Number(integerPart.slice(2, 4));
      const seconds = Number(integerPart.slice(4, 6)) + setDecimal(decimalPart);
      parts = [degrees, minutes, seconds];
    } else if (integerPart.length === 5) {
      // Longitude DM.m format dddmm
      const degrees = Number(integerPart.slice(0, 3));
      const minutes = Number(integerPart.slice(3, 5)) + setDecimal(decimalPart);
      parts = [degrees, minutes];
    } else if (integerPart.length === 4) {
      // Latitude DM.m format ddmm
      const degrees = Number(integerPart.slice(0, 2));
      const minutes = Number(integerPart.slice(2, 4)) + setDecimal(decimalPart);
      parts = [degrees, minutes];
    } else if (integerPart.length <= 3) {
      // Latitude or Longitude D.d format ddd or dd
      const degrees = Number(integerPart.slice(0, 3)) + setDecimal(decimalPart);
      parts = [degrees];
    }
  }

  if (parts.length === 1) {
    // D.d format
    let result = parts[0];
    result *= direction;
    return result;
  }
  if (parts.length === 2) {
    // DM.m format
    let result = parts[0] + parts[1] / 60;
    result *= direction;
    return result;
  }
  if (parts.length === 3) {
    // DMS.s format
    let result = parts[0] + parts[1] / 60 + parts[2] / 3600;
    result *= direction;
    return result;
  }
  return null;
}

console.log("412412.2N = 41.40338889");
console.log(toDecimalDegrees("412412.2N"));

console.log("");
console.log("4124.202N = 41.40336667");
console.log(toDecimalDegrees("4124.202N"));

console.log("");
console.log("41.4034N should = 41.4034");
console.log(toDecimalDegrees("41.4034N"));

console.log("");
console.log("412412N should = 41.40333333");
console.log(toDecimalDegrees("412412N"));

console.log("");
console.log("412412.2S should = -41.40338889");
console.log(toDecimalDegrees("412412.2S"));

console.log("");
console.log("412412.2W should = -41.40338889");
console.log(toDecimalDegrees("412412.2W"));

console.log("");
console.log("1763424.55W should = -176.5734861");
console.log(toDecimalDegrees("1763424.55W"));

console.log("");
console.log("53 14 44.943N should = 53.2458175");
console.log(toDecimalDegrees("53 14 44.943N"));

console.log("");
console.log(`53°14'44.943"N should = 53.2458175`);
console.log(toDecimalDegrees(`53°14'44.943"N`));

console.log("");
console.log(`53° 14' 44.943" N should = 53.2458175`);
console.log(toDecimalDegrees(`53° 14' 44.943" N`));
