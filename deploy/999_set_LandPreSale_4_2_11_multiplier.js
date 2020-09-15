module.exports = async ({deployments, getNamedAccounts}) => {
  const {read, execute, log} = deployments;
  const {landSaleAdmin} = await getNamedAccounts();

  const landSaleName = "LandPreSale_4_2_11";
  const oldSANDPrice = 0.036367;
  const newSANDPrice = 0.036367;

  const newMultiplier = Math.floor((newSANDPrice / oldSANDPrice) * 1000);

  const currentMultiplier = await read(landSaleName, "getSandMultiplier");
  if (currentMultiplier != newMultiplier) {
    log(`setting new multiplier ${newMultiplier} (current was ${currentMultiplier})`);
    await execute(landSaleName, {from: landSaleAdmin, skipUnknownSigner: true}, "rebalanceSand", newMultiplier);
  }
};
module.exports.skip = async ({getChainId}) => (await getChainId()) !== "1";
