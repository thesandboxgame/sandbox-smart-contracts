const ethers = require("ethers");
const {solidityKeccak256} = ethers.utils;
const crypto = require("crypto");

function calculateLandHash(land, salt) {
  const types = ["uint256", "uint256", "uint256", "uint256", "address", "bytes32"];
  const values = [
    land.x,
    land.y,
    land.size,
    land.price,
    land.reserved || "0x0000000000000000000000000000000000000000",
    land.salt || salt,
  ];
  if (land.assetIds) {
    types.push("uint256[]");
    values.push(land.assetIds);
  }
  return solidityKeccak256(types, values);
}

function saltLands(lands, secret) {
  const saltedLands = [];
  for (const land of lands) {
    let salt = land.salt;
    if (!salt) {
      if (!secret) {
        throw new Error("Land need to have a salt or be generated via secret");
      }
      salt =
        "0x" +
        crypto
          .createHmac("sha256", secret)
          .update(calculateLandHash(land, "0x0000000000000000000000000000000000000000000000000000000000000000"))
          .digest("hex");
    }
    saltedLands.push({
      x: land.x,
      y: land.y,
      size: land.size,
      price: land.price,
      reserved: land.reserved,
      salt,
      assetIds: land.assetIds,
    });
  }
  return saltedLands;
}

function createDataArray(lands, secret) {
  const data = [];

  lands.forEach((land) => {
    let salt = land.salt;
    if (!salt) {
      if (!secret) {
        throw new Error("Land need to have a salt or be generated via secret");
      }
      salt =
        "0x" +
        crypto
          .createHmac("sha256", secret)
          .update(calculateLandHash(land, "0x0000000000000000000000000000000000000000000000000000000000000000"))
          .digest("hex");
    }
    data.push(calculateLandHash(land, salt));
  });

  return data;
}

module.exports = {
  createDataArray,
  calculateLandHash,
  saltLands,
};
