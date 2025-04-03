import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin, assetAdmin} = await getNamedAccounts();

  const AssetContract = await deployments.get('Asset');
  const AuthValidatorContract = await deployments.get('AuthSuperValidator');

  const name = 'Sandbox Asset Reveal';
  const version = '1.0';

  const SandboxForwarder = await deployments.get('SandboxForwarder');

  await deploy('AssetReveal', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/asset/contracts/AssetReveal.sol:AssetReveal',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          name,
          version,
          AssetContract.address,
          AuthValidatorContract.address,
          SandboxForwarder.address,
          assetAdmin,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = [
  'AssetReveal',
  'AssetReveal_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'Asset_deploy',
  'AuthSuperValidator_deploy',
  'SandboxForwarder',
  'AuthSuperValidator_v2', // use updated AuthSuperValidator
];
