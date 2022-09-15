import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('LAND_SWAP_TRUSTED_FORWARDER', {
    from: deployer,
    contract: 'TestMetaTxForwarder',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['LAND_SWAP_TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;
