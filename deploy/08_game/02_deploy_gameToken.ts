import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin, upgradeAdmin} = await getNamedAccounts();
  const asset1155Contract = await deployments.get('GameAsset1155');
  const asset721Contract = await deployments.get('GameAsset721');
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
          asset1155Contract.address,
          asset721Contract.address,
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
  'GameAsset1155_deploy',
  'GameAsset721_deploy',
  'TRUSTED_FORWARDER',
];
// TODO: Setup deploy-polygon folder and network.
func.skip = skipUnlessTest; // TODO enable
