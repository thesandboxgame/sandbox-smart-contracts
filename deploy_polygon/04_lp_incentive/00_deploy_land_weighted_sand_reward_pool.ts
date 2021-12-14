import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const stakeToken = await deployments.get('QUICKSWAP_SAND_MATIC');
  let land;
  if (hre.network.name === 'hardhat') {
    // workaround for tests
    land = await deployments.get('MockLandWithMint');
  } else {
    land = await deployments.get('PolygonLand');
  }
  const sand = await deployments.get('PolygonSand');

  const durationInSeconds = 28 * 24 * 60 * 60;
  await deploy('PolygonLandWeightedSANDRewardPool', {
    from: deployer,
    log: true,
    args: [stakeToken.address, sand.address, land.address, durationInSeconds],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'PolygonLandWeightedSANDRewardPool',
  'PolygonLandWeightedSANDRewardPool_deploy',
  'L2',
];
func.dependencies = [
  'MockLandWithMint',
  'PolygonLand',
  'PolygonSand',
  'QUICKSWAP_SAND_MATIC',
];
