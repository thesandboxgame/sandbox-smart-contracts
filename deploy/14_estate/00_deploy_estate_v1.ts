import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;

  const landContract = await deployments.get('Land');
  const forwarder = await deployments.get('TestMetaTxForwarder');

  await deploy('EstateV1', {
    from: deployer,
    args: [forwarder.address, landContract.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Land_deploy', 'TestMetaTxForwarder_deploy'];
func.skip = skipUnlessTest;
