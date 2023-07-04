import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin, trustedForwarder} = await getNamedAccounts();

  const AssetContract = await deployments.get('Asset');
  const AuthValidatorContract = await deployments.get('AuthValidator');

  const name = 'Sandbox Asset Reveal';
  const version = '1.0';

  await deploy('AssetReveal', {
    from: deployer,
    contract: '@sandbox-smart-contracts/asset/contracts/AssetReveal.sol:AssetReveal',
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
          trustedForwarder,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = ['Asset', 'AssetReveal', 'AssetReveal_deploy'];
func.dependencies = ['Asset_deploy', 'Catalyst_deploy', 'AuthValidator_deploy'];
