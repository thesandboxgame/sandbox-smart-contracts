import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  // Upgrade implementation contract
  await deploy('Catalyst', {
    from: deployer,
    contract: 'CatalystV2',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1,
      methodName: 'reinitialize',
      viaAdminContract: {
        name: 'DefaultProxyAdmin',
      },
    },
    log: true,
  });
};
export default func;

func.tags = ['Catalyst', 'Catalyst_upgrade_v2', 'L2'];
func.dependencies = ['Catalyst_deploy'];
