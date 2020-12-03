import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {gemsCatalystsRegistryAdmin, deployer} = await getNamedAccounts();
  await deploy(`GemsCatalystsRegistry`, {
    from: deployer,
    log: true,
    args: [gemsCatalystsRegistryAdmin],
  });
};
export default func;
func.tags = ['GemsCatalystsRegistry', 'GemsCatalystsRegistry_deploy'];
