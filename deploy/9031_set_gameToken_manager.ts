import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {assetAdmin} = await getNamedAccounts();
  const gameManager = await deployments.get('GameManager');

  const isGameManager = await read(
    'gameToken',
    'isGameManager',
    gameManager.address
  );

  if (!isGameManager) {
    await execute(
      'gameToken',
      {from: assetAdmin, log: true},
      'setGameManager',
      gameManager.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['GameToken', 'GameToken_setup'];
func.dependencies = ['GameToken_deploy', 'GameManager_deploy'];
