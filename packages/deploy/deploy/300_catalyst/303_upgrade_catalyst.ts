import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;

  const {deployer, upgradeAdmin} =
    await getNamedAccounts();

    await catchUnknownSigner(deploy('Catalyst', {
    from: deployer,
    log: true,
    contract: '@sandbox-smart-contracts/asset/contracts/Catalyst.sol:Catalyst',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1,
    },
  }));
};
export default func;
func.tags = ['Catalyst_upgrade', 'L2'];
func.dependencies = ['Catalyst_deploy', 'Catalyst_setup'];
