import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  await deploy('TRUSTED_FORWARDER_V2', {
    from: deployer,
    contract: 'contracts/mocks/TrustedForwarderMock.sol:TrustedForwarderMock',
    log: true,
  });
};
export default func;
func.tags = ['TRUSTED_FORWARDER', 'TRUSTED_FORWARDER_V2'];
