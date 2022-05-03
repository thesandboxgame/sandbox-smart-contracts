import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, estateTokenAdmin, upgradeAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  //const landContract = await deployments.get('PolygonLand');
  //const landContract = await deployments.get('MockLandWithMint');
  const gameToken = await deployments.get('ChildGameToken');
  let landContract;
  if (hre.network.name === 'hardhat') {
    // workaround for tests
    landContract = await deployments.get('MockLandWithMint');
  } else {
    landContract = await deployments.get('PolygonLand');
  }

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const chainIndex = 1; // L2 (Polygon). Use 0 for Ethereum-Mainnet.

  await deploy('EstateToken', {
    from: deployer,
    contract: 'PolygonEstateTokenV1',
    log: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [
          TRUSTED_FORWARDER.address,
          estateTokenAdmin,
          landContract.address, //'0xFeD17c5b2B5A59D3c8690a2cc666D41255376062',
          gameToken.address,
          chainIndex,
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['PolygonEstateToken', 'PolygonEstateToken_deploy'];
func.dependencies = [
  'MockLandWithMint_deploy',
  'ChildGameToken_setup',
  'PolygonLand_deploy',
  'TRUSTED_FORWARDER',
  //'PolygonLand_deploy',
];
func.skip = skipUnlessTestnet;
// TODO: Setup deploy-polygon folder and network.
