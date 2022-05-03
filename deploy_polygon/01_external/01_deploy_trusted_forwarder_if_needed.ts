import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  await deployTrustedForwarder(hre, deployer, 'TRUSTED_FORWARDER');
  await deployTrustedForwarder(hre, deployer, 'TRUSTED_FORWARDER_V2');
};

async function deployTrustedForwarder(
  hre: HardhatRuntimeEnvironment,
  from: string,
  name: string
) {
  const {deployments} = hre;
  const {deploy} = deployments;
  await deploy(name, {
    from,
    contract: 'TestMetaTxForwarder',
    log: true,
    skipIfAlreadyDeployed: true,
  });
}

export default func;
func.tags = ['TRUSTED_FORWARDER', 'TRUSTED_FORWARDER_V2', 'L2'];
func.skip = skipUnlessTest; // @todo enable once we've setup actual trusted forwarder
