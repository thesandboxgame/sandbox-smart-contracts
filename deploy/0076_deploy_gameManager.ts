import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameMinterAdmin} = await getNamedAccounts();
  const gameContract = await deployments.get('GameToken');
  const sandContract = await deployments.get('Sand');

  await deploy('GameMinter', {
    from: deployer,
    log: true,
    args: [gameContract.address, gameMinterAdmin, sandContract.address],
  });
};

export default func;
func.tags = ['GameManager', 'GameManager_deploy'];
func.dependencies = ['GameToken_deploy', 'Sand_deploy'];
