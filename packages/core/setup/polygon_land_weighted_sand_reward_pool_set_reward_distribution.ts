import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function () {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {deployer, liquidityRewardAdmin} = await getNamedAccounts();
  const REWARD_NAME = 'PolygonLandWeightedSANDRewardPool';
  const currentRewardDistribution = await read(
    REWARD_NAME,
    'rewardDistribution'
  );
  if (
    currentRewardDistribution.toLowerCase() !==
    liquidityRewardAdmin.toLowerCase()
  ) {
    await execute(
      REWARD_NAME,
      {from: deployer, log: true},
      'setRewardDistribution',
      liquidityRewardAdmin
    );
  }
};
export default func;
if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
