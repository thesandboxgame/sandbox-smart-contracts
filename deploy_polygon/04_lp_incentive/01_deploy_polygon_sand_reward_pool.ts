import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const stakeToken = await deployments.get('FakeLPSandMatic');
  const sand = await deployments.get('PolygonSand');

  await deploy('PolygonSANDRewardPool', {
    from: deployer,
    log: true,
    args: [stakeToken.address, sand.address],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonSANDRewardPool', 'PolygonSANDRewardPool_deploy', 'L2'];
func.dependencies = ['SandBaseToken_deploy', 'FakeLPSandMatic'];
func.skip = skipUnlessTest;
