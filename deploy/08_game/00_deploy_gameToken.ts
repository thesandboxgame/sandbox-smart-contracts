import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    gameTokenAdmin,
    mintableAssetPredicate,
  } = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');
  const assetContract = await deployments.get('Asset');
  const testMetaTxForwarder = await deployments.get('TestMetaTxForwarder');

  // @review mintableAssetPredicate doesn't belong in namedAccounts (it's a contract, not an EOA).
  // make its value network-dependent and use dummy address for testing

  await deploy('GameToken', {
    from: deployer,
    log: true,
    args: [
      sandContract.address,
      gameTokenAdmin,
      assetContract.address,
      mintableAssetPredicate,
    ],
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['GameToken', 'GameToken_deploy'];
func.dependencies = ['Asset_deploy', 'TestMetaTxForwarder_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO enable
