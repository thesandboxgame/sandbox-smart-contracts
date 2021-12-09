import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();

  const stakeToken = await deployments.get('QUICKSWAP_SAND_MATIC');

  await execute(
    'PolygonLandWeightedSANDRewardPool',
    {from: deployer, log: true},
    'SetStakeLPToken',
    stakeToken.address
  );
};
export default func;
func.tags = ['PolygonLandWeightedSANDRewardPool_setup', 'L2'];
func.dependencies = ['PolygonLandWeightedSANDRewardPool'];
