const fs = require("fs");
const {deployments, getChainId, ethers, getNamedAccounts} = require("@nomiclabs/buidler");
const {execute} = deployments;

(async () => {
  const chainId = await getChainId();
  const {landSaleAdmin} = await getNamedAccounts();

  const bundleInfo = JSON.parse(fs.readFileSync(`data/LandPreSale_4_3/bundles_${chainId}.json`));
  const sectorInfo = JSON.parse(fs.readFileSync(`data/LandPreSale_4_3/sector15_${chainId}.json`));
  const assetIds = new Set();

  function countBundleId(bundleId) {
    if (bundleId && bundleId !== "") {
      const bundle = bundleInfo[bundleId];
      for (const assetId of bundle) {
        assetIds.add(assetId);
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

  const ids = [...assetIds];

  const Asset = await ethers.getContract("Asset");
  const Presale = await ethers.getContract("LandPreSale_4_3");
  const destination = process.argv[2]; // 0x7A9fe22691c811ea339D9B73150e6911a5343DcA

  if (!destination || destination === "") {
    throw new Error("destination required");
  }

  const balances = await Asset.balanceOfBatch(
    ids.map(() => Presale.address),
    ids
  );

  console.log(JSON.stringify(ids, null, "  "));
  console.log(
    JSON.stringify(
      balances.map((v) => v.toString()),
      null,
      "  "
    )
  );

  await execute(
    "LandPreSale_4_3",
    {from: landSaleAdmin, skipUnknownSigner: true},
    "withdrawAssets",
    destination,
    ids,
    balances
  );
})();
