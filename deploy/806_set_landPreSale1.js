module.exports = async ({deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const sand = await deployments.getOrNull("Sand");
  if (!sand) {
    throw new Error("no Sand contract deployed");
  }
  const land = await deployments.getOrNull("Land");
  if (!land) {
    throw new Error("no Land contract deployed");
  }
  const landSale = await deployments.getOrNull("LandPreSale_1");
  if (!landSale) {
    throw new Error("no LandPreSale_1 contract deployed");
  }

  const isMinter = await call("Land", "isMinter", landSale.address);
  if (!isMinter) {
    log("setting LandPreSale_1 as Land minter");
    const currentLandAdmin = await call("Land", "getAdmin");
    await sendTxAndWait(
      {from: currentLandAdmin, gas: 1000000, skipUnknownSigner: true},
      "Land",
      "setMinter",
      landSale.address,
      true
    );
  }
};
