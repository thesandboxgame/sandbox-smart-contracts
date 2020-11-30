import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');
  const assetContract = await deployments.get('Asset');

  let gameManager;
  const gameManagerContract = await deployments.getOrNull('GameTokenManager');

  if (!gameManagerContract) {
    gameManager = ethers.utils.getAddress(
      '0x0000000000000000000000000000000000000000'
    );
    // @review in this case we should only allow deploying to hardhat-network !
    const message =
      '!!! GameManager not deployed, using address(0) instead !!!';
    console.log('\n \x1b[31m%s\x1b[0m \n', message);
  } else {
    gameManager = gameManagerContract.address;
  }

  await deploy('GameToken', {
    from: deployer,
    log: true,
    args: [
      sandContract.address,
      gameTokenAdmin,
      gameManager,
      assetContract.address,
    ],
  });
};

export default func;
func.tags = ['GameToken', 'GameToken_deploy'];
func.dependencies = ['Sand', 'Asset'];
