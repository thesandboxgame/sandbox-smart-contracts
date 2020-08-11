module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;
  const chainId = await getChainId();

  const {landSaleAdmin} = await getNamedAccounts();

  const landSaleName = "LandPreSale_3";

  const landSale = await deployments.get(landSaleName);

  const isMinter = await read("Land", "isMinter", landSale.address);
  if (!isMinter) {
    log("setting LandPreSale_3 as Land minter");
    const currentLandAdmin = await read("Land", "getAdmin");
    await execute("Land", {from: currentLandAdmin, skipUnknownSigner: true}, "setMinter", landSale.address, true);
  }

  const isDAIEnabled = await read(landSaleName, "isDAIEnabled");
  if (!isDAIEnabled) {
    log("enablingDAI for LandPreSale_3");
    const currentLandSaleAdmin = await read(landSaleName, "getAdmin");
    await execute(landSaleName, {from: currentLandSaleAdmin, skipUnknownSigner: true}, "setDAIEnabled", true);
  }

  if (chainId == 4) {
    return; // skip on chainId 4 as we changed the admin and do not care for old presales
  }

  const currentAdmin = await read(landSaleName, "getAdmin");
  if (currentAdmin.toLowerCase() !== landSaleAdmin.toLowerCase()) {
    log("setting LandPreSale_3 Admin");
    await execute(landSaleName, {from: currentAdmin, skipUnknownSigner: true}, "changeAdmin", landSaleAdmin);
  }
};
module.exports.dependencies = ["LandPreSale_3", "Land"];
