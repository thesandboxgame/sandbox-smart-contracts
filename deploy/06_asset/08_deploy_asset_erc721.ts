import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {assetAdmin, upgradeAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const ERC721_PREDICATE = await deployments.get('MINTABLE_ERC721_PREDICATE');

  await deploy('Asset', {
    from: upgradeAdmin,
    contract: 'AssetERC721',
    libraries: {},
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          TRUSTED_FORWARDER.address,
          assetAdmin,
          ERC721_PREDICATE.address,
          0,
        ],
      },
      upgradeIndex: 1,
    },
    log: true,
  });
};

export default func;
func.tags = ['Asset', 'AssetERC721', 'AssetERC721_deploy'];
func.runAtTheEnd = true;
func.dependencies = ['TRUSTED_FORWARDER', 'MINTABLE_ERC721_PREDICATE'];
