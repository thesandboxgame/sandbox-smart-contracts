import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let testMetaTxForwarder = await deployments.getOrNull('TestMetaTxForwarder');
  if (!testMetaTxForwarder) {
    testMetaTxForwarder = await deploy('TestMetaTxForwarder', {
      from: deployer,
      contract: 'TestMetaTxForwarder',
      log: true,
    });
  }
};
export default func;
func.tags = ['TestMetaTxForwarder', 'TestMetaTxForwarder_deploy'];
func.skip = skipUnlessTest;
