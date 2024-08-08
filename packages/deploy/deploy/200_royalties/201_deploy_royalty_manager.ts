import {ZeroAddress} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

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
          ZeroAddress,
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'RoyaltyManager',
  'RoyaltyManager_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['RoyaltySplitter_deploy'];
