import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;
  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();
  await catchUnknownSigner(
    deploy('LandMetadataRegistry', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/land/contracts/LandMetadataRegistry.sol:LandMetadataRegistry',
      log: true,
      skipIfAlreadyDeployed: true,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [sandAdmin],
        },
        upgradeIndex: 0,
      },
    })
  );
};

func.tags = [
  'Land',
  'LandMetadataRegistry',
  'LandMetadataRegistry_deploy',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
];
export default func;
