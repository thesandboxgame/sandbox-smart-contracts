import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameManagerAdmin} = await getNamedAccounts();
  const gameContract = await deployments.get('GameToken');
  const sandContract = await deployments.get('Sand');

  await deploy('GameManager', {
    from: deployer,
    log: true,
    args: [gameContract.address, gameManagerAdmin, sandContract.address],
  });
};

export default func;
func.tags = ['GameManager', 'GameManager_deploy'];
func.dependencies = ['GameToken', 'Sand'];
