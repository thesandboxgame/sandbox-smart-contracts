import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin, upgradeAdmin} = await getNamedAccounts();
  const assetContract = await deployments.get('Asset');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const chainIndex = 1; // L2 (Polygon). Use 0 for Ethereum-Mainnet.

  await deploy('ChildGameToken', {
    from: deployer,
    contract: 'ChildGameTokenV1',
    log: true,
    args: [
      TRUSTED_FORWARDER.address,
      gameTokenAdmin,
      assetContract.address,
      chainIndex,
    ],
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      methodName: 'initV1',
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['ChildGameToken', 'ChildGameToken_deploy'];
func.dependencies = ['Asset_deploy', 'TRUSTED_FORWARDER'];
// TODO: Setup deploy-polygon folder and network.
func.skip = skipUnlessTest; // TODO enable
