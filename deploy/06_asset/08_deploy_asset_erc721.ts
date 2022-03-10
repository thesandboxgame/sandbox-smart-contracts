import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {assetAdmin, upgradeAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('AssetERC721', {
    from: upgradeAdmin,
    contract: 'AssetERC721',
    libraries: {},
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [TRUSTED_FORWARDER.address, assetAdmin],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['AssetERC721', 'AssetERC721_deploy'];
func.runAtTheEnd = true;
func.dependencies = ['TRUSTED_FORWARDER', 'MINTABLE_ERC721_PREDICATE'];
