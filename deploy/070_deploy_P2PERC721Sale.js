module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, P2PERC721SaleAdmin} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");

  await deploy("TestERC721", {
    from: deployer,
    args: [sandContract.address, P2PERC721SaleAdmin],
    log: true,
  });

  await deploy("P2PERC721Sale", {
    from: deployer,
    args: [sandContract.address, P2PERC721SaleAdmin, P2PERC721SaleAdmin, 10000],
    log: true,
  });
};
module.exports.skip = async () => true; //  guard(['1', '4', '314159'], 'LandPreSale_2_with_referral');
