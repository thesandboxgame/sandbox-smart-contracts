import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const {deployer} = await getNamedAccounts();
  await deploy(`GemsCatalystsRegistry`, {
    from: deployer,
    log: true,
    args: [deployer, TRUSTED_FORWARDER.address],
  });
};
export default func;
func.tags = ['GemsCatalystsRegistry', 'GemsCatalystsRegistry_deploy', 'L2'];
func.dependencies = ['TRUSTED_FORWARDER'];
func.skip = skipUnlessTest; // disabled for now
