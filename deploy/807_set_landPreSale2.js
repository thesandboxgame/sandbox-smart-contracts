module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const chainId = await getChainId();

  const {landSaleAdmin} = await getNamedAccounts();

  const landSaleName = "LandPreSale_2";

  const sand = await deployments.getOrNull("Sand");
  if (!sand) {
    throw new Error("no Sand contract deployed");
  }
  const land = await deployments.getOrNull("Land");
  if (!land) {
    throw new Error("no Land contract deployed");
  }
  const landSale = await deployments.getOrNull(landSaleName);
  if (!landSale) {
    throw new Error("no LandPreSale_2 contract deployed");
  }

  const isMinter = await call("Land", "isMinter", landSale.address);
  if (!isMinter) {
    log("setting LandPreSale_2 as Land minter");
    const currentLandAdmin = await call("Land", "getAdmin");
    await sendTxAndWait(
      {from: currentLandAdmin, gas: 1000000, skipUnknownSigner: true},
      "Land",
      "setMinter",
      landSale.address,
      true
    );
  }

  const isDAIEnabled = await call(landSaleName, "isDAIEnabled");
  if (!isDAIEnabled) {
    log("enablingDAI for LandPreSale_2");
    const currentLandSaleAdmin = await call(landSaleName, "getAdmin");
    await sendTxAndWait(
      {from: currentLandSaleAdmin, gas: 1000000, skipUnknownSigner: true},
      landSaleName,
      "setDAIEnabled",
      true
    );
  }

  if (chainId == 4) {
    return; // skip on chainId 4 as we changed the admin and do not care for old presales
  }

  const currentAdmin = await call(landSaleName, "getAdmin");
  if (currentAdmin.toLowerCase() !== landSaleAdmin.toLowerCase()) {
    log("setting LandPreSale_2 Admin");
    await sendTxAndWait(
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true},
      landSaleName,
      "changeAdmin",
      landSaleAdmin
    );
  }
};
