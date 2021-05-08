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
  const chainIndex = 0; // Ethereum-Mainnet. Use 1 for polygon L2

  await deploy('EstateV1', {
    from: deployer,
    args: [TRUSTED_FORWARDER.address, landContract.address, chainIndex],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['Estate', 'Estate_deploy'];
func.dependencies = ['Land_deploy', 'TRUSTED_FORWARDER'];
func.skip = skipUnlessTest;
