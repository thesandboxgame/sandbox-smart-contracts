import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, assetAdmin, upgradeAdmin} = await getNamedAccounts();

  const AssetContract = await deployments.get('Asset');
  const AuthValidatorContract = await deployments.get('AuthSuperValidator');
  const CatalystContract = await deployments.get('Catalyst');

  const name = 'Sandbox Asset Create';
  const version = '1.0';

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

  await deploy('AssetCreate', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/asset@1.1.0/contracts/AssetCreate.sol:AssetCreate',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          name,
          version,
          AssetContract.address,
          CatalystContract.address,
          AuthValidatorContract.address,
          TRUSTED_FORWARDER.address,
          assetAdmin, // DEFAULT_ADMIN_ROLE
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = [
  'Asset',
  'AssetCreate',
  'AssetCreate_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'Asset_deploy',
  'Catalyst_deploy',
  'Catalyst_setup',
  'AuthSuperValidator_deploy',
  'TRUSTED_FORWARDER_V2',
];
