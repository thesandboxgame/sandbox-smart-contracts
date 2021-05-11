import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {gameTokenAdmin} = await getNamedAccounts();

  const childGameToken = await deployments.getOrNull('ChildGameToken');
  if (!childGameToken) {
    return;
  }

  const gameMinter = await deployments.getOrNull('GameMinter');
  if (!gameMinter) {
    return;
  }

  const currentMinter = await read('ChildGameToken', 'getMinter');
  const isMinter = currentMinter == gameMinter.address;

  if (!isMinter) {
    await execute(
      'ChildGameToken',
      {from: gameTokenAdmin, log: true},
      'changeMinter',
      gameMinter.address
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['ChildGameToken', 'ChildGameToken_setup'];
func.dependencies = ['ChildGameToken_deploy, GameMinter_deploy'];
