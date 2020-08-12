module.exports = async ({deployments}) => {
  const {read, execute, log} = deployments;

  const landSale = await deployments.get("LandPreSale_1");

  const isMinter = await read("Land", "isMinter", landSale.address);
  if (!isMinter) {
    log("setting LandPreSale_1 as Land minter");
    const currentLandAdmin = await read("Land", "getAdmin");
    await execute(
      "Land",
      {from: currentLandAdmin, gas: 1000000, skipUnknownSigner: true},
      "setMinter",
      landSale.address,
      true
    );
  }
};
module.exports.dependencies = ["LandPreSale_1", "Land"];
