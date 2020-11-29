import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {gemsCatalystsRegistryOwner} = await getNamedAccounts();
  await deploy(`GemsCatalystsRegistry`, {
    from: gemsCatalystsRegistryOwner,
    log: true,
    args: [gemsCatalystsRegistryOwner],
  });
};
export default func;
func.tags = ['GemsCatalystsRegistry', 'GemsCatalystsRegistry_deploy'];
