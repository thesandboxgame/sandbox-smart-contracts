import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {waitFor} from '../../utils';

export const setupAssetUpgrader = deployments.createFixture(async () => {
  await deployments.fixture();
  const {assetAttributesRegistryAdmin} = await getNamedAccounts();
  const assetUpgraderContract: Contract = await ethers.getContract(
    'AssetUpgrader'
  );
  const assetAttributesRegistry: Contract = await ethers.getContract(
    'AssetAttributesRegistry'
  );

  await waitFor(
    assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .changeMinter(assetUpgraderContract)
  );

  const sandContract: Contract = await ethers.getContract('Sand');
  const assetContract: Contract = await ethers.getContract('Asset');
  const feeRecipient: string = await assetUpgraderContract.callStatic.feeRecipient();
  const upgradeFee: BigNumber = await assetUpgraderContract.callStatic.upgradeFee();

  return {
    assetAttributesRegistryAdmin,
    assetUpgraderContract,
    assetAttributesRegistry,
    sandContract,
    assetContract,
    feeRecipient,
    upgradeFee,
  };
});
