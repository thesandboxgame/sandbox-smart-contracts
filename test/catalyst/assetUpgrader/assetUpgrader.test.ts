import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../../chai-setup';
import {setupAssetUpgrader} from './fixtures';
import {_setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';
import {setCatalyst} from '../assetAttributesRegistry/fixtures';
import {waitFor} from '../../utils';

const GEM_CATALYST_UNIT = BigNumber.from('1000000000000000000');

describe('AssetUpgrader', function () {
  async function mintAsset(minter: string) {
    const {assetBouncerAdmin} = await getNamedAccounts();
    const assetContract = await ethers.getContract('Asset');

    await assetContract
      .connect(ethers.provider.getSigner(assetBouncerAdmin))
      .setBouncer(assetBouncerAdmin, true);

    const assetId = await assetContract
      .connect(ethers.provider.getSigner(assetBouncerAdmin))
      .callStatic.mint(
        minter,
        22,
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        1,
        1,
        minter,
        Buffer.from('data')
      );
    await assetContract
      .connect(ethers.provider.getSigner(assetBouncerAdmin))
      .mint(
        minter,
        22,
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        1,
        1,
        minter,
        Buffer.from('data')
      );
    return assetId;
  }

  async function setSuperOperator(superOperator: string) {
    const {assetAdmin} = await getNamedAccounts();
    const assetContract = await ethers.getContract('Asset');
    await assetContract
      .connect(ethers.provider.getSigner(assetAdmin))
      .setSuperOperator(superOperator, true);
  }
  // it('changeCatalyst for rareCatalyst ', async function () {
  //   const {
  //     assetAttributesRegistryAdmin,
  //     assetUpgraderContract,
  //     assetAttributesRegistry,
  //     sandContract,
  //     assetContract,
  //     feeRecipient,
  //     upgradeFee,
  //   } = await setupAssetUpgrader();
  //   const {
  //     rareCatalyst,
  //     catalystOwner,
  //     powerGem,
  //     defenseGem,
  //   } = await _setupGemsAndCatalysts();

  //   await setSuperOperator(assetUpgraderContract.address);

  //   const users = await getUnnamedAccounts();
  //   const assetId = await mintAsset(catalystOwner);
  //   const powerGemId = await powerGem.gemId();
  //   const defenseGemId = await defenseGem.gemId();

  //   const catalystId = await rareCatalyst.catalystId();
  //   const totalSupplyBeforeRareCatalyst = await rareCatalyst.totalSupply();
  //   const balanceBeforeBurning = await rareCatalyst.balanceOf(catalystOwner);

  //   const balanceBeforeBurningPowerGem = await powerGem.balanceOf(
  //     catalystOwner
  //   );
  //   const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(
  //     catalystOwner
  //   );
  //   const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
  //   const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();

  //   const sandBalanceFromBefore = await sandContract.balanceOf(catalystOwner);
  //   const sandBalanceToBefore = await sandContract.balanceOf(feeRecipient);

  //   await assetUpgraderContract
  //     .connect(ethers.provider.getSigner(catalystOwner))
  //     .changeCatalyst(
  //       catalystOwner,
  //       assetId,
  //       catalystId,
  //       [powerGemId, defenseGemId],
  //       users[2]
  //     );

  //   const sandBalanceFromAfter = await sandContract.balanceOf(catalystOwner);
  //   const sandBalanceToAfter = await sandContract.balanceOf(feeRecipient);

  //   const totalSupplyAfterRareCatalyst = await rareCatalyst.totalSupply();
  //   const balanceAfterBurningRareCatalyst = await rareCatalyst.balanceOf(
  //     catalystOwner
  //   );
  //   const balanceAfterBurningPowerGem = await powerGem.balanceOf(catalystOwner);
  //   const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(
  //     catalystOwner
  //   );
  //   const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
  //   const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();
  //   // check catalyst burn
  //   expect(balanceAfterBurningRareCatalyst).to.equal(
  //     balanceBeforeBurning.sub(GEM_CATALYST_UNIT)
  //   );
  //   expect(totalSupplyAfterRareCatalyst).to.equal(
  //     totalSupplyBeforeRareCatalyst.sub(GEM_CATALYST_UNIT)
  //   );
  //   // check gem burn
  //   expect(balanceAfterBurningPowerGem).to.equal(
  //     balanceBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
  //   );
  //   expect(balanceAfterBurningDefenseGem).to.equal(
  //     balanceBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
  //   );
  //   expect(totalSupplyAfterBurningPowerGem).to.equal(
  //     totalSupplyBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
  //   );
  //   expect(totalSupplyAfterBurningDefenseGem).to.equal(
  //     totalSupplyBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
  //   );
  //   // check sand fee transfer
  //   expect(sandBalanceFromAfter).to.equal(
  //     sandBalanceFromBefore.sub(upgradeFee)
  //   );
  //   expect(sandBalanceToAfter).to.equal(sandBalanceToBefore.add(upgradeFee));
  //   // check assetAttributesRegistry
  //   const record = await assetAttributesRegistry.getRecord(assetId);
  //   expect(record.catalystId).to.equal(catalystId);
  //   expect(record.exists).to.equal(true);
  //   // check asset
  //   const newOwner = await assetContract.callStatic.ownerOf(assetId);
  //   expect(newOwner).to.equal(users[2]);
  // });

  // it('addGems for rareCatalyst', async function () {
  //   const {
  //     assetAttributesRegistryAdmin,
  //     assetUpgraderContract,
  //     assetAttributesRegistry,
  //     sandContract,
  //     assetContract,
  //     feeRecipient,
  //     upgradeFee,
  //   } = await setupAssetUpgrader();
  //   const {
  //     gemsCatalystsRegistry,
  //     rareCatalyst,
  //     catalystOwner,
  //     powerGem,
  //     defenseGem,
  //   } = await _setupGemsAndCatalysts();
  //   await setSuperOperator(assetUpgraderContract.address);
  //   await assetAttributesRegistry
  //     .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
  //     .changeMinter(assetAttributesRegistryAdmin);
  //   const users = await getUnnamedAccounts();
  //   const assetId = await mintAsset(catalystOwner);
  //   const powerGemId = await powerGem.gemId();
  //   const defenseGemId = await defenseGem.gemId();
  //   const catalystId = await rareCatalyst.catalystId();

  //   const balanceBeforeBurningPowerGem = await powerGem.balanceOf(
  //     catalystOwner
  //   );
  //   const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(
  //     catalystOwner
  //   );
  //   const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
  //   const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();
  //   await powerGem
  //     .connect(ethers.provider.getSigner(catalystOwner))
  //     .approve(gemsCatalystsRegistry, 100000000000000);
  //   await defenseGem
  //     .connect(ethers.provider.getSigner(catalystOwner))
  //     .approve(gemsCatalystsRegistry, 100000000000000);

  //   await setCatalyst(assetId, catalystId, []);
  //   await assetUpgraderContract
  //     .connect(ethers.provider.getSigner(catalystOwner))
  //     .addGems(catalystOwner, assetId, [powerGemId, defenseGemId], users[2]);

  //   const balanceAfterBurningPowerGem = await powerGem.balanceOf(catalystOwner);
  //   const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(
  //     catalystOwner
  //   );
  //   const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
  //   const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();

  //   // check gem burn
  //   expect(balanceAfterBurningPowerGem).to.equal(
  //     balanceBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
  //   );
  //   expect(balanceAfterBurningDefenseGem).to.equal(
  //     balanceBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
  //   );
  //   expect(totalSupplyAfterBurningPowerGem).to.equal(
  //     totalSupplyBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
  //   );
  //   expect(totalSupplyAfterBurningDefenseGem).to.equal(
  //     totalSupplyBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
  //   );
  // });
});
