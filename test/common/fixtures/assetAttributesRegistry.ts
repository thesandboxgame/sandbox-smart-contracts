import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {mintCatalyst, mintGem} from '../../polygon/catalyst/utils';
import {depositViaChildChainManager} from '../../polygon/sand/fixtures';
import {expect} from '../../chai-setup';
import {setupUser} from '../../utils';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const assetAttributesRegistryFixture = async () => {
  const assetAttributesRegistry: Contract = await ethers.getContract(
    'PolygonAssetAttributesRegistry'
  );
  const assetUpgrader: Contract = await ethers.getContract(
    'PolygonAssetUpgrader'
  );
  const assetMinter: Contract = await ethers.getContract('PolygonAssetMinter');
  const {
    assetAttributesRegistryAdmin,
    sandBeneficiary,
    sandAdmin,
  } = await getNamedAccounts();
  const users = await getUnnamedAccounts();
  const user0 = users[0];
  const mockedMigrationContractAddress = users[1];
  const sandContract = await ethers.getContract('PolygonSand');
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');

  const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
    sandContract,
  });

  const sandAmount = BigNumber.from(100000).mul('1000000000000000000');

  // The only way to deposit PolygonSand in L2 is via the childChainManager
  await depositViaChildChainManager(
    {sand: sandContract, childChainManager},
    sandBeneficiary,
    sandAmount
  );
  await depositViaChildChainManager(
    {sand: sandContract, childChainManager},
    sandAdmin,
    sandAmount
  );

  const tx = await sandBeneficiaryUser.sandContract.transfer(user0, sandAmount);
  tx.wait();

  expect(await sandContract.balanceOf(user0)).to.equal(sandAmount);

  const power: Contract = await ethers.getContract('PolygonGem_POWER');
  const defense: Contract = await ethers.getContract('PolygonGem_DEFENSE');
  const speed: Contract = await ethers.getContract('PolygonGem_SPEED');
  const magic: Contract = await ethers.getContract('PolygonGem_MAGIC');
  const luck: Contract = await ethers.getContract('PolygonGem_LUCK');
  const common: Contract = await ethers.getContract('PolygonCatalyst_COMMON');
  const rare: Contract = await ethers.getContract('PolygonCatalyst_RARE');
  const epic: Contract = await ethers.getContract('PolygonCatalyst_EPIC');
  const legendary: Contract = await ethers.getContract(
    'PolygonCatalyst_LEGENDARY'
  );

  const gemsCatalystsUnit = '1000000000000000000';
  const mintingAmount = BigNumber.from('8').mul(
    BigNumber.from(gemsCatalystsUnit)
  );

  const gemContracts = [power, defense, speed, luck, magic];
  const catContracts = [common, rare, epic, legendary];

  async function mintAllGems(user: string, amount: BigNumber): Promise<void> {
    for (const contract of gemContracts) {
      await mintGem(contract, amount, user);
    }
  }

  async function mintAllCats(user: string, amount: BigNumber): Promise<void> {
    for (const contract of catContracts) {
      await mintCatalyst(contract, amount, user);
    }
  }

  await mintAllGems(user0, mintingAmount);
  await mintAllCats(user0, mintingAmount);

  const assetAttributesRegistryAsUser0 = await assetAttributesRegistry.connect(
    ethers.provider.getSigner(user0)
  );
  const assetAttributesRegistryAsRegistryAdmin = await assetAttributesRegistry.connect(
    ethers.provider.getSigner(assetAttributesRegistryAdmin)
  );
  const assetUpgraderAsUser0 = await assetUpgrader.connect(
    ethers.provider.getSigner(user0)
  );
  const assetMinterAsUser0 = await assetMinter.connect(
    ethers.provider.getSigner(user0)
  );
  const assetAttributesRegistryAsmockedMigrationContract = await assetAttributesRegistry.connect(
    ethers.provider.getSigner(mockedMigrationContractAddress)
  );

  return {
    mockedMigrationContractAddress,
    user0,
    assetAttributesRegistry,
    assetAttributesRegistryAdmin,
    assetUpgrader,
    assetAttributesRegistryAsUser0,
    assetAttributesRegistryAsRegistryAdmin,
    assetAttributesRegistryAsmockedMigrationContract,
    assetUpgraderAsUser0,
    assetMinterAsUser0,
    assetMinter,
  };
};
