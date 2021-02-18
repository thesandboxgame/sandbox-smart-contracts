import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import { BigNumber, Contract } from 'ethers';
import { toWei, waitFor } from '../../utils';
import { mintCatalyst, transferSand } from '../utils';

export const setupCollectionCatalystMigrations = deployments.createFixture(async () => {
  await deployments.fixture();
  const { collectionCatalystMigrationsAdmin } = await getNamedAccounts();
  const users = await getUnnamedAccounts();
  const user0 = users[0];

  const collectionCatalystMigrationsContract: Contract = await ethers.getContract(
    'CollectionCatalystMigrations'
  );
  const oldCatalystRegistry: Contract = await ethers.getContract(
    'OldCatalystRegistry'
  );
  const oldCatalystMinter: Contract = await ethers.getContract(
    'OldCatalystMinter'
  );

  const collectionCatalystMigrationsContractAsAdmin = await collectionCatalystMigrationsContract.connect(
    ethers.provider.getSigner(collectionCatalystMigrationsAdmin)
  );
  const oldCatalystMinterAsUser0 = await oldCatalystMinter.connect(
    ethers.provider.getSigner(user0)
  );

  return {
    oldCatalystMinterAsUser0,
    collectionCatalystMigrationsContractAsAdmin,
    oldCatalystRegistry,
    oldCatalystMinter,
    user0
  }
});

export const setupUser = async (user: string) => {
  const { gemMinter } = await getNamedAccounts();

  const gem: Contract = await ethers.getContract("OldGems");
  const gemAsGemMinter = await gem.connect(
    ethers.provider.getSigner(gemMinter)
  );
  const catalyst = await ethers.getContract(`OldCatalysts`);
  const sand = await ethers.getContract("Sand");
  await transferSand(sand, user, toWei(4));
  for (let i = 0; i < 5; i++) {
    await gemAsGemMinter.mint(user, i, 50);
  }
  for (let i = 0; i < 4; i++) {
    await catalyst.mint(user, i, 20);
  }
};
