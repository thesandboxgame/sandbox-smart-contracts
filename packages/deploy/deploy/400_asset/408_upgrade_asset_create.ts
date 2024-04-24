import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await catchUnknownSigner(
    deploy('AssetCreate', {
      from: deployer,
      log: true,
      contract:
        '@sandbox-smart-contracts/asset/contracts/AssetCreate.sol:AssetCreate',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 1,
      },
    })
  );
};
export default func;
func.tags = ['AssetCreate_upgrade', 'L2'];
func.dependencies = [
  'AssetCreate_deploy',
  'AssetCreate_setup',
  'Exchange_deploy',
];
