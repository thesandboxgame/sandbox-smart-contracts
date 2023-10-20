import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('RoyaltiesRegistry', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/marketplace/contracts/RoyaltiesRegistry.sol:RoyaltiesRegistry',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: '__RoyaltiesRegistry_init',
        args: [],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['RoyaltiesRegistry', 'RoyaltiesRegistry_deploy'];
