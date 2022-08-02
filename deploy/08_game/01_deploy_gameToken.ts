import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin, upgradeAdmin} = await getNamedAccounts();
  const erc1155Contract = await deployments.get('Asset'); // TODO: change to PolygonAssetERC1155
  const erc721Contract = await deployments.get('AssetERC721'); // TODO: change to PolygonAssetERC721
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const chainIndex = 1; // L2 (Polygon). Use 0 for Ethereum-Mainnet.

  await deploy('ChildGameToken', {
    from: deployer,
    contract: 'ChildGameTokenV1',
    log: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [
          TRUSTED_FORWARDER.address,
          gameTokenAdmin,
          erc1155Contract.address,
          erc721Contract.address,
          chainIndex,
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['ChildGameToken', 'ChildGameToken_deploy'];
func.dependencies = [
  'Asset_deploy',
  'AssetERC721_deploy',
  'Sand',
  'TRUSTED_FORWARDER',
];
// TODO: Setup deploy-polygon folder and network. Delete MockAsset contracts
func.skip = skipUnlessTest; // TODO: enable
