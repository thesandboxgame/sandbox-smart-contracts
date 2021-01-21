import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');
  const assetContract = await deployments.get('Asset');

  // for testing purposes. Use GameMinter contract when ready.
  const inititalMinter = gameTokenAdmin;

  await deploy('GameToken', {
    from: deployer,
    log: true,
    args: [
      sandContract.address,
      gameTokenAdmin,
      assetContract.address,
      inititalMinter,
    ],
  });
};

export default func;
func.tags = ['GameToken', 'GameToken_deploy'];
func.dependencies = ['Sand_deploy', 'Asset_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO enable
