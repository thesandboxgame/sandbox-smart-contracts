module.exports = async ({getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const {landSaleAdmin} = await getNamedAccounts();

  const landSaleName = "LandPreSale_4_1";
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
    throw new Error("no LandPreSale_4_1 contract deployed");
  }

  const isMinter = await call("Land", "isMinter", landSale.address);
  if (!isMinter) {
    log("setting LandPreSale_4_1 as Land minter");
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
    log("enablingDAI for LandPreSale_4_1");
    const currentLandSaleAdmin = await call(landSaleName, "getAdmin");
    await sendTxAndWait(
      {from: currentLandSaleAdmin, gas: 1000000, skipUnknownSigner: true},
      landSaleName,
      "setDAIEnabled",
      true
    );
  }

  const currentAdmin = await call(landSaleName, "getAdmin");
  if (currentAdmin.toLowerCase() !== landSaleAdmin.toLowerCase()) {
    log("setting LandPreSale_4_1 Admin");
    await sendTxAndWait(
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true},
      landSaleName,
      "changeAdmin",
      landSaleAdmin
    );
  }

  // TODO if we want to enable SAND
  // const isSandSuperOperator = await call(sand, 'isSuperOperator', landSale.address);
  // if (!isSandSuperOperator) {
  //     log('setting LandPreSale_4_1 as super operator for Sand');
  //     const currentSandAdmin = await call(sand, 'getAdmin');
  //     await sendTxAndWait({from: currentSandAdmin, gas: 100000, skipUnknownSigner: true}, sand, 'setSuperOperator', landSale.address, true);
  // }
};
module.exports.skip = async () => true; // TODO
