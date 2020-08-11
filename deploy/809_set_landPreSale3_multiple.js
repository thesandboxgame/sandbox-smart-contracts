module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;

  const {landSaleAdmin} = await getNamedAccounts();

  for (let sector = 4; sector < 10; sector++) {
    const landSaleName = "LandPreSale_3_" + sector;
    const landSale = await deployments.get(landSaleName);

    const isMinter = await read("Land", "isMinter", landSale.address);
    if (!isMinter) {
      log(`setting ${landSaleName} as Land minter`);
      const currentLandAdmin = await read("Land", "getAdmin");
      await execute("Land", {from: currentLandAdmin, skipUnknownSigner: true}, "setMinter", landSale.address, true);
    }

    const isDAIEnabled = await read(landSaleName, "isDAIEnabled");
    if (!isDAIEnabled) {
      log(`enablingDAI for ${landSaleName}`);
      const currentLandSaleAdmin = await read(landSaleName, "getAdmin");
      await execute(landSaleName, {from: currentLandSaleAdmin, skipUnknownSigner: true}, "setDAIEnabled", true);
    }

    const currentAdmin = await read(landSaleName, "getAdmin");
    if (currentAdmin.toLowerCase() !== landSaleAdmin.toLowerCase()) {
      log(`setting ${landSaleName} Admin`);
      await execute(landSaleName, {from: currentAdmin, skipUnknownSigner: true}, "changeAdmin", landSaleAdmin);
    }
  }
};
module.exports.dependencies = ["LandPreSale_3_multiple", "Land"];
