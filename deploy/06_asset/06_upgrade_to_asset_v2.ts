import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, assetBouncerAdmin, assetAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const forwarder = await deployments.get('TestMetaTxForwarder');

  let ERC1155_PREDICATE = await deployments.getOrNull('ERC1155_PREDICATE');
  if (!ERC1155_PREDICATE) {
    ERC1155_PREDICATE = await deploy('ERC1155_PREDICATE', {
      from: deployer,
      contract: 'FakePredicateForwarder',
      log: true,
    });
  }

  await deploy('Asset', {
    from: deployer,
    contract: 'AssetV2',
    args: [
      forwarder.address,
      assetAdmin,
      assetBouncerAdmin,
      ERC1155_PREDICATE.address,
    ],
    proxy: {
      owner: deployer,
      proxyContract: 'OpenZeppelinTransparentProxy',
      methodName: 'initV2',
      upgradeIndex: 1,
    },
    log: true,
  });

  console.log('Asset upgraded to AssetV2');
};

export default func;
func.tags = ['AssetV2', 'AssetV2_deploy'];
func.runAtTheEnd = true;
func.dependencies = [
  'Asset_deploy',
  'Asset_setup',
  'AssetMinter_deploy',
  'TestMetaTxForwarder_deploy',
  'GameToken_setup',
];
func.skip = async (hre) => hre.network.name !== 'hardhat';
