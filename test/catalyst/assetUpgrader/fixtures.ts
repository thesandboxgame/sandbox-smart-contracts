import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {setupUsers, waitFor} from '../../utils';

export const setupAssetUpgrader = deployments.createFixture(async () => {
  await deployments.fixture();
  const {assetAttributesRegistryAdmin, assetAdmin} = await getNamedAccounts();
  const assetUpgraderContract: Contract = await ethers.getContract(
    'AssetUpgrader'
  );
  const assetAttributesRegistry: Contract = await ethers.getContract(
    'AssetAttributesRegistry'
  );
  const assetContract = await ethers.getContract('Asset');
  const sandContract: Contract = await ethers.getContract('Sand');

  await waitFor(
    assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .changeMinter(assetUpgraderContract.address)
  );
  await waitFor(
    assetContract
      .connect(ethers.provider.getSigner(assetAdmin))
      .setSuperOperator(assetUpgraderContract.address, true)
  );
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
