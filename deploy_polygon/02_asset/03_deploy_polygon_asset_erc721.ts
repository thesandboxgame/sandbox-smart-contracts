import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, assetAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const TRUSTED_FORWARDER_V2 = await deployments.getOrNull(
    'TRUSTED_FORWARDER_V2'
  );

  await deploy('PolygonAssetERC721', {
    from: deployer,
    contract: 'PolygonAssetERC721',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          TRUSTED_FORWARDER_V2?.address || TRUSTED_FORWARDER.address, // TODO:
          assetAdmin,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });

  // Set baseUri
  await deployments.execute(
    'PolygonAssetERC721',
    {from: assetAdmin, log: true},
    'setBaseUri',
    'http://sandbox.asset.erc721' // TODO: confirm desired baseUri
  );
};

export default func;
func.tags = ['PolygonAssetERC721', 'PolygonAssetERC721_deploy', 'L2'];
func.dependencies = ['TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;
