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
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('EstateV1', {
    from: deployer,
    args: [TRUSTED_FORWARDER.address, landContract.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Land_deploy', 'TRUSTED_FORWARDER'];
func.skip = async (hre) => hre.network.name !== 'hardhat';
