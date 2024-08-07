import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  await deployments.deploy('SignedMultiGiveaway', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/giveaway/contracts/SignedMultiGiveaway.sol:SignedMultiGiveaway',
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
func.tags = [
  'SignedMultiGiveaway',
  'SignedMultiGiveaway_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
