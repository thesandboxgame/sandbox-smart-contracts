import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const stakeToken = await deployments.get('FakeLPSandMatic'); // TODO: Change to Sushiswap once ready
  const land = await deployments.get('Land'); // TODO: switch to PolygonLand & fix the test (no minting on polygon) when PolygonLand is ready
  const sand = await deployments.get('PolygonSand');

  const durationInSeconds = 30 * 24 * 60 * 60;
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
  'PolygonLand_deploy',
  'PolygonSand_deploy',
  'FakeLPSandMatic',
];
func.skip = skipUnlessTestnet;
