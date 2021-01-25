import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const stakeToken = await deployments.get('UNI_SAND_ETH');
  const land = await deployments.get('Land');
  const sand = await deployments.get('Sand');

  const durationInSeconds = 30 * 24 * 60 * 60;
  await deploy('LandWeightedSANDRewardPool', {
    from: deployer,
    log: true,
    args: [stakeToken.address, sand.address, land.address, durationInSeconds],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['LandWeightedSANDRewardPool', 'LandWeightedSANDRewardPool_deploy'];
func.dependencies = ['Land_deploy', 'Sand_deploy', 'UNI_SAND_ETH']; // TODO what if no uni_sand is to be executed ?
