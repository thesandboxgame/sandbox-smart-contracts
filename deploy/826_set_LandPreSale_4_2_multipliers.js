module.exports = async ({deployments, getNamedAccounts}) => {
  const {read, execute, log} = deployments;
  const {landSaleAdmin} = await getNamedAccounts();

  for (let sector = 11; sector <= 14; sector++) {
    const landSaleName = "LandPreSale_4_2_" + sector;
    const oldSANDPrice = 0.036367;
    const newSANDPrice = 0.047455;

    const newMultiplier = Math.floor((oldSANDPrice / newSANDPrice) * 1000);

    const currentMultiplier = await read(landSaleName, "getSandMultiplier");
    if (currentMultiplier != newMultiplier) {
      log(`setting new multiplier ${newMultiplier} (current was ${currentMultiplier})`);
      await execute(landSaleName, {from: landSaleAdmin, skipUnknownSigner: true}, "rebalanceSand", newMultiplier);
    }
  }
};
module.exports.skip = async ({getChainId}) => (await getChainId()) !== "1";
