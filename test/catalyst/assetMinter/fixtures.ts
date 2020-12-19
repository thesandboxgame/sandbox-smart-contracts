import {
  ethers,
  deployments,
} from 'hardhat';
import { Contract } from 'ethers';

export const setupAssetMinter = deployments.createFixture(async () => {
  await deployments.fixture();
  const assetMinterContract: Contract = await ethers.getContract(
    'AssetMinter'
  );

  return {
    assetMinterContract
  };
});
