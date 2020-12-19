import {
  ethers,
  deployments,
  getNamedAccounts,
} from 'hardhat';
import { Contract } from 'ethers';

export const setupAssetAttributesRegistry = deployments.createFixture(async () => {
  await deployments.fixture();
  const assetAttributesRegistry: Contract = await ethers.getContract(
    'AssetAttributesRegistry'
  );
  const { assetAttributesRegistryAdmin } = await getNamedAccounts();

  return {
    assetAttributesRegistry,
    assetAttributesRegistryAdmin
  };
});
