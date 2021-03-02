import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {gameTokenAdmin} = await getNamedAccounts();

  const gameToken = await deployments.getOrNull('GameToken');
  if (!gameToken) {
    return;
  }

  const gameMinter = await deployments.getOrNull('GameMinter');
  if (!gameMinter) {
    return;
  }

  const currentMinter = await read('GameToken', 'getMinter');
  const isMinter = currentMinter == gameMinter.address;

  if (!isMinter) {
    await execute(
      'GameToken',
      {from: gameTokenAdmin, log: true},
      'changeMinter',
      gameMinter.address
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['GameToken', 'GameToken_setup'];
func.dependencies = ['GameToken_deploy, GameMinter_deploy'];
