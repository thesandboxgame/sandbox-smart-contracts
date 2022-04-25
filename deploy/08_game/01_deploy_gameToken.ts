import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin, upgradeAdmin} = await getNamedAccounts();
  const erc1155Contract = await deployments.get('MockERC1155Asset');
  const erc721Contract = await deployments.get('MockERC721Asset');
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
  'MockERC1155Asset_deploy',
  'MockERC721Asset_deploy',
  'TRUSTED_FORWARDER',
];
// TODO: Setup deploy-polygon folder and network.
func.skip = skipUnlessTest; // TODO enable
