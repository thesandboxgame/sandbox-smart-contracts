import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {waitFor} from '../../utils';

export const setupAssetUpgrader = deployments.createFixture(async () => {
  await deployments.fixture();
  const {assetAttributesRegistryAdmin, assetAdmin} = await getNamedAccounts();
  const users = await getUnnamedAccounts();
  const catalystOwner = users[0];

  const assetUpgraderContract: Contract = await ethers.getContract(
    'AssetUpgrader'
  );
  const assetAttributesRegistry: Contract = await ethers.getContract(
    'AssetAttributesRegistry'
  );
  const assetContract = await ethers.getContract('Asset');
  const sandContract: Contract = await ethers.getContract('Sand');
  const feeRecipient: string = await assetUpgraderContract.callStatic.feeRecipient();
  const upgradeFee: BigNumber = await assetUpgraderContract.callStatic.upgradeFee();
  const gemAdditionFee: BigNumber = await assetUpgraderContract.callStatic.gemAdditionFee();
  const rareCatalyst: Contract = await ethers.getContract('Catalyst_RARE');
  const powerGem: Contract = await ethers.getContract('Gem_POWER');
  const defenseGem: Contract = await ethers.getContract('Gem_DEFENSE');
  const gemsCatalystsRegistry: Contract = await ethers.getContract(
    'GemsCatalystsRegistry'
  );
  const gemsCatalystsUnit = '1000000000000000000';

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

  return {
    users,
    catalystOwner,
    rareCatalyst,
    powerGem,
    defenseGem,
    assetAttributesRegistryAdmin,
    assetUpgraderContract,
    assetAttributesRegistry,
    sandContract,
    assetContract,
    feeRecipient,
    upgradeFee,
    gemAdditionFee,
    gemsCatalystsUnit,
    gemsCatalystsRegistry,
  };
});
