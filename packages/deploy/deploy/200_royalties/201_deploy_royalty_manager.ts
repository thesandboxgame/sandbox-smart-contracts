import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export const ROYALTY_SPLIT = 5000;

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {
    deployer,
    upgradeAdmin,
    commonRoyaltyReceiver,
    royaltyManagerAdmin,
    contractRoyaltySetter,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const RoyaltySplitter = await deployments.get('RoyaltySplitter');

  await deploy('RoyaltyManager', {
    from: deployer,
    log: true,
    contract:
      '@sandbox-smart-contracts/dependency-royalty-management/contracts/RoyaltyManager.sol:RoyaltyManager',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          commonRoyaltyReceiver,
          ROYALTY_SPLIT,
          RoyaltySplitter.address,
          royaltyManagerAdmin,
          contractRoyaltySetter,
          TRUSTED_FORWARDER.address,
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['RoyaltyManager', 'RoyaltyManager_deploy', 'L2'];
func.dependencies = ['RoyaltySplitter_deploy', 'TRUSTED_FORWARDER_V2'];
