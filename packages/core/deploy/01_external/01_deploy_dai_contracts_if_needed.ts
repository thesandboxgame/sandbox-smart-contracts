import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let daiMedianizer = await deployments.getOrNull('DAIMedianizer');
  if (!daiMedianizer) {
    daiMedianizer = await deploy('DAIMedianizer', {
      from: deployer,
      contract: 'FakeMedianizer',
      log: true,
    });
  }

  let dai = await deployments.getOrNull('DAI');
  if (!dai) {
    dai = await deploy('DAI', {
      from: deployer,
      contract: 'FakeDai',
      log: true,
    });
  }
};
export default func;
func.tags = ['DAI', 'DAIMedianizer', 'DAI_deploy', 'DAIMedianizer_deploy'];
