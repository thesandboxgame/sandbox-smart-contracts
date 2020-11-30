import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const Asset = await deployments.get('Asset');
  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );
  const OldCatalystRegistry = await deployments.get('OldCatalystRegistry');

  const {deployer} = await getNamedAccounts();
  const merkleRoot =
    '0x0000000000000000000000000000000000000000000000000000000000000000'; // TODO
  await deploy(`CatalystMigrations`, {
    from: deployer,
    log: true,
    args: [
      Asset.address,
      AssetAttributesRegistry.address,
      OldCatalystRegistry.address,
      merkleRoot,
    ],
  });
};
export default func;
func.tags = ['CatalystMigrations', 'CatalystMigrations_deploy'];
func.dependencies = [
  'OldCatalystRegistry_deploy',
  'Asset_deploy',
  'AssetAttributesRegistry_deploy',
];
