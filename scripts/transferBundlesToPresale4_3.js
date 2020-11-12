const fs = require("fs");
const {deployments} = require("@nomiclabs/buidler");
const {execute} = deployments;

const bundleInfo = JSON.parse(fs.readFileSync("data/LandPreSale_4_3/bundles.json"));
const sectorInfo = JSON.parse(fs.readFileSync("data/LandPreSale_4_3/sector15.json"));
const assetIdsCount = {};

function countBundleId(bundleId) {
  if (bundleId && bundleId !== "") {
    const bundle = bundleInfo[bundleId];
    for (const assetId of bundle) {
      assetIdsCount[assetId] = (assetIdsCount[assetId] || 0) + 1;
    }
  }
}

for (const sector of sectorInfo) {
  for (const land of sector.lands) {
    countBundleId(land.bundleId);
  }
  for (const estate of sector.estates) {
    countBundleId(estate.bundleId);
  }
}

console.log(JSON.stringify(assetIdsCount, null, "  "));

(async () => {
  const presale = await deployments.get("LandPreSale_4_3");
  const owner = "0x7A9fe22691c811ea339D9B73150e6911a5343DcA";
  const ids = [];
  const values = [];
  for (const assetId of Object.keys(assetIdsCount)) {
    ids.push(assetId);
    values.push(assetIdsCount[assetId]);
  }
  await execute(
    "Asset",
    {from: owner, skipUnknownSigner: true},
    "safeBatchTransferFrom",
    owner,
    presale.address,
    ids,
    values,
    "0x"
  );
})();
