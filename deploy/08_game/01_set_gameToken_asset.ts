import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {assetAdmin} = await getNamedAccounts();

  const gameToken = await deployments.getOrNull('GameToken');
  if (!gameToken) {
    return;
  }

  const isSuperOperator = await read(
    'Asset',
    'isSuperOperator',
    gameToken.address
  );

  if (!isSuperOperator) {
    await execute(
      'Asset',
      {from: assetAdmin, log: true},
      'setSuperOperator',
      gameToken.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['GameToken', 'GameToken_setup'];
func.dependencies = ['GameToken_deploy'];
