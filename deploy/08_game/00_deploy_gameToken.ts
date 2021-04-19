import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');
  const assetContract = await deployments.get('Asset');

  const others = await getUnnamedAccounts();
  const mintableAssetPredicate = others[7];
  const trustedForwarder = others[9];

  // @todo setup minimal trustedForwarder contract for testing.
  // @todo make mintableAssetPredicate network-dependent and use dummy address for testing
  // @todo make trustedForwarder network-dependent and use dummy address for testing

  await deploy('GameToken', {
    from: deployer,
    log: true,
    args: [
      gameTokenAdmin,
      assetContract.address,
      mintableAssetPredicate,
      trustedForwarder,
    ],
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['GameToken', 'GameToken_deploy'];
func.dependencies = ['Sand_deploy', 'Asset_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO enable
