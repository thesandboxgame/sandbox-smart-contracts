import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin, assetAdmin} = await getNamedAccounts();

  const AssetContract = await deployments.get('Asset');
  const AuthValidatorContract = await deployments.get('AuthSuperValidator');

  const name = 'Sandbox Asset Reveal';
  const version = '1.0';

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

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
          TRUSTED_FORWARDER.address,
          assetAdmin,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = ['AssetReveal', 'AssetReveal_deploy', 'L2'];
func.dependencies = [
  'Asset_deploy',
  'AuthSuperValidator_deploy',
  'TRUSTED_FORWARDER_V2',
];
