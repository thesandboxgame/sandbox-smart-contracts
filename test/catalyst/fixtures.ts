import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import { Contract, BigNumber } from 'ethers';


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
