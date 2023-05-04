import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  await deployments.deploy('ERC20SignedClaim', {
    from: deployer,
    contract: 'SignedERC20Giveaway',
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [TRUSTED_FORWARDER.address, sandAdmin],
      },
      upgradeIndex: 0,
    },
  });
};

export default func;
func.tags = ['Cashback', 'ERC20SignedClaim', 'ERC20SignedClaim_deploy', 'L2'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
