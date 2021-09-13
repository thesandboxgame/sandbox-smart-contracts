import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let TRUSTED_FORWARDER = await deployments.getOrNull('TRUSTED_FORWARDER');
  if (!TRUSTED_FORWARDER) {
    TRUSTED_FORWARDER = await deploy('TRUSTED_FORWARDER', {
      from: deployer,
      contract: 'TestMetaTxForwarder',
      log: true,
    });
  }
};
export default func;
func.tags = ['TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet; // @todo enable once we've setup actual trusted forwarder
