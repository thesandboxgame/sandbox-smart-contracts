import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const contract = await deployments.getOrNull('ERC20SignedClaim');
  if (contract) {
    console.warn('reusing ERC20SignedClaim', contract.address);
  } else {
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
  }
};

export default func;
func.tags = ['ERC20SignedClaim', 'ERC20SignedClaim_deploy', 'L2'];
func.dependencies = ['TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;
