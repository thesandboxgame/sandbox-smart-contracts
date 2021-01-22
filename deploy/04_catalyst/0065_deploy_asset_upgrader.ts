import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );
  const Sand = await deployments.get('Sand');
  const Asset = await deployments.get('Asset');
  const GemsCatalystsRegistry = await deployments.get('GemsCatalystsRegistry');

  const {deployer, catalystAssetFeeRecipient} = await getNamedAccounts();

  const upgradeFee = BigNumber.from(0); // TODO
  const gemAdditionFee = BigNumber.from(0); // TODO

  await deploy(`AssetUpgrader`, {
    from: deployer,
    log: true,
    args: [
      AssetAttributesRegistry.address,
      Sand.address,
      Asset.address,
      GemsCatalystsRegistry.address,
      upgradeFee,
      gemAdditionFee,
      catalystAssetFeeRecipient,
    ],
  });
};
export default func;
func.tags = ['AssetUpgrader', 'AssetUpgrader_deploy'];
func.dependencies = [
  'AssetAttributesRegistry_deploy',
  'Sand_Deploy',
  'Asset_Deploy',
  'GemsCatalystsRegistry_deploy',
];
