const {read} = require("../../lib/spreadsheet");

module.exports = async () => {
  const values = await read("1ND3IZdBRaEdWDaoBIqMnp4tS4FIZEWomJ9c0n1Lmw04", "ROUND 3 — Partners Giveaway (ESTATES)");
  // console.log(values);
  const data = [];
  for (const row of values) {
    if (row.length === 0 || row[0] !== "1") {
      continue;
    }
    let size;
    if (row.length > 1) {
      const sizeSpec = row[1];
      if (sizeSpec === "24x24") {
        size = 24;
      } else if (sizeSpec === "6x6") {
        size = 6;
      } else if (sizeSpec === "12x12") {
        size = 12;
      } else if (sizeSpec === "3x3") {
        size = 3;
      } else if (sizeSpec === "1x1") {
        size = 1;
      } else {
        console.log("unsuported size spec : ", sizeSpec);
      }
    }
    let location;
    if (row.length > 2) {
      location = row[2];
    }

    let coordinates;
    if (row.length > 3) {
      const s = row[3];
      let xy;
      if (s.indexOf(",") !== -1) {
        xy = s.split(",");
      } else if (s.indexOf(";") !== -1) {
        xy = s.split(";");
      } else {
        console.log("s", s);
      }
      if (xy) {
        coordinates = {
          x: parseInt(xy[0], 10), // +204 is donw after ward
          y: parseInt(xy[1], 10), // +204 is donw after ward
        };
        if (!coordinates.x || !coordinates.y) {
          console.log(coordinates);
          console.log(xy);
        }
      }
    }

    let logo;
    if (row.length > 4) {
      logo = row[4];
    }

    let partner;
    if (row.length > 5) {
      partner = row[5];
    }

    let to;
    if (row.length > 6) {
      to = row[6];
    }

    if (!partner && to.toLowerCase() === "0x7a9fe22691c811ea339d9b73150e6911a5343dca") {
      partner = "Sandbox";
    }

    let minter;
    if (row.length > 7) {
      minter = row[7];
    }

    data.push({
      size,
      location,
      coordinates,
      logo,
      partner,
      to,
      minter,
    });
  }
  return data.filter(
    (r) =>
      r.size &&
      r.coordinates &&
      r.to &&
      r.to.toLowerCase() !== "0x7a9fe22691c811ea339d9b73150e6911a5343dca" &&
      r.minter &&
      r.minter.toLowerCase() === "0x7a9fe22691c811ea339d9b73150e6911a5343dca"
  );
};
