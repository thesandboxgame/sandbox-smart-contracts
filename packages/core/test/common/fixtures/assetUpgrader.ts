import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {waitFor} from '../../utils';
import {depositViaChildChainManager} from '../../polygon/sand/fixtures';
import {expect} from '../../chai-setup';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const assetUpgraderFixtures = async () => {
  const {
    assetAttributesRegistryAdmin,
    assetAdmin,
    sandAdmin,
    sandBeneficiary,
  } = await getNamedAccounts();
  const users = await getUnnamedAccounts();
  const catalystOwner = users[0];
  const user2 = users[2];
  const user4 = users[4];
  const user5 = users[5];
  const user10 = users[10];

  const assetUpgraderContract: Contract = await ethers.getContract(
    'PolygonAssetUpgrader'
  );
  const assetAttributesRegistry: Contract = await ethers.getContract(
    'PolygonAssetAttributesRegistry'
  );
  const assetERC721Contract: Contract = await ethers.getContract(
    'PolygonAssetERC721'
  );
  const assetContract: Contract = await ethers.getContract(
    'PolygonAssetERC1155'
  );
  const sandContract: Contract = await ethers.getContract('PolygonSand');
  const feeRecipient: string = await assetUpgraderContract.callStatic.feeRecipient();
  const upgradeFee: BigNumber = await assetUpgraderContract.callStatic.upgradeFee();
  const gemAdditionFee: BigNumber = await assetUpgraderContract.callStatic.gemAdditionFee();
  const rareCatalyst: Contract = await ethers.getContract(
    'PolygonCatalyst_RARE'
  );
  const powerGem: Contract = await ethers.getContract('PolygonGem_POWER');
  const defenseGem: Contract = await ethers.getContract('PolygonGem_DEFENSE');
  const gemsCatalystsRegistry: Contract = await ethers.getContract(
    'PolygonGemsCatalystsRegistry'
  );
  const gemsCatalystsUnit = '1000000000000000000';

  const assetUpgraderFeeBurnerContract: Contract = await ethers.getContract(
    'PolygonAssetUpgraderFeeBurner'
  );
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  const SUPER_OPERATOR_ROLE = await gemsCatalystsRegistry.SUPER_OPERATOR_ROLE();
  await waitFor(
    assetContract
      .connect(ethers.provider.getSigner(assetAdmin))
      .setSuperOperator(assetUpgraderContract.address, true)
  );

  await waitFor(
    gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(assetAdmin))
      .grantRole(SUPER_OPERATOR_ROLE, assetUpgraderFeeBurnerContract.address)
  );
  await waitFor(
    gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(assetAdmin))
      .grantRole(SUPER_OPERATOR_ROLE, assetUpgraderContract.address)
  );

  const MINTER_ROLE = await assetERC721Contract.MINTER_ROLE();
  await waitFor(
    assetERC721Contract
      .connect(ethers.provider.getSigner(assetAdmin))
      .grantRole(MINTER_ROLE, assetContract.address)
  );

  await waitFor(
    assetContract
      .connect(ethers.provider.getSigner(assetAdmin))
      .setBouncer(assetUpgraderContract.address, true)
  );

  // The only way to deposit PolygonSand in L2 is via the childChainManager
  const sandContractAsAdmin = await sandContract.connect(
    ethers.provider.getSigner(sandAdmin)
  );
  const sandAmount = BigNumber.from(100000).mul('1000000000000000000');
  await depositViaChildChainManager(
    {sand: sandContract, childChainManager},
    sandBeneficiary,
    sandAmount
  );
  expect(await sandContract.balanceOf(sandBeneficiary)).to.equal(sandAmount);

  await depositViaChildChainManager(
    {sand: sandContract, childChainManager},
    sandAdmin,
    sandAmount
  );
  await sandContractAsAdmin.transfer(catalystOwner, sandAmount);

  await sandContract
    .connect(ethers.provider.getSigner(catalystOwner))
    .approve(assetUpgraderContract.address, sandAmount);

  expect(await sandContract.balanceOf(catalystOwner)).to.equal(sandAmount);

  const assetUpgraderContractAsCatalystOwner = await assetUpgraderContract.connect(
    ethers.provider.getSigner(catalystOwner)
  );

  const assetUpgraderContractAsUser4 = await assetUpgraderContract.connect(
    ethers.provider.getSigner(user4)
  );

  const powerGemAsUser4 = await powerGem.connect(
    ethers.provider.getSigner(user4)
  );

  const defenseGemAsUser4 = await defenseGem.connect(
    ethers.provider.getSigner(user4)
  );
  return {
    user2,
    user4,
    user5,
    user10,
    catalystOwner,
    rareCatalyst,
    powerGem,
    defenseGem,
    assetAttributesRegistryAdmin,
    assetUpgraderContract,
    assetAttributesRegistry,
    sandContract,
    assetContract,
    assetERC721Contract,
    feeRecipient,
    upgradeFee,
    gemAdditionFee,
    gemsCatalystsUnit,
    gemsCatalystsRegistry,
    assetUpgraderContractAsCatalystOwner,
    powerGemAsUser4,
    defenseGemAsUser4,
    assetUpgraderContractAsUser4,
    assetUpgraderFeeBurnerContract,
  };
};
