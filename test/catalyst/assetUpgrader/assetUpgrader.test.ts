import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../../chai-setup';
import {setupAssetUpgrader} from './fixtures';
import {waitFor} from '../../utils';
import {
  changeCatalyst,
  mintAsset,
  mintCatalyst,
  mintGem,
  transferSand,
} from '../utils';

const GEM_CATALYST_UNIT = BigNumber.from('1000000000000000000');

describe('AssetUpgrader', function () {
  // it('extractAndSetCatalyst', async function () {
  //   const {
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

  //   const catalystId = await rareCatalyst.catalystId();
  //   const assetId = await mintAsset(catalystOwner, 1);
  //   await waitFor(
  //     assetUpgraderContract
  //       .connect(ethers.provider.getSigner(catalystOwner))
  //       .extractAndSetCatalyst(
  //         catalystOwner,
  //         assetId,
  //         catalystId,
  //         [],
  //         catalystOwner
  //       )
  //   );
  // });
  it('setting a rareCatalyst with powerGem and defenseGem', async function () {
    const {
      assetUpgraderContract,
      assetAttributesRegistry,
      sandContract,
      assetContract,
      feeRecipient,
      upgradeFee,
      rareCatalyst,
      powerGem,
      defenseGem,
      gemsCatalystsUnit,
    } = await setupAssetUpgrader();

    const users = await getUnnamedAccounts();
    await transferSand(
      sandContract,
      users[5],
      BigNumber.from('2').mul(upgradeFee)
    );
    const mintingAmount = BigNumber.from('8').mul(
      BigNumber.from(gemsCatalystsUnit)
    );
    await mintCatalyst(rareCatalyst, mintingAmount, users[5]);
    await mintGem(powerGem, mintingAmount, users[5]);
    await mintGem(defenseGem, mintingAmount, users[5]);
    const assetId = await mintAsset(users[5], 1);
    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();

    const catalystId = await rareCatalyst.catalystId();
    const totalSupplyBeforeRareCatalyst = await rareCatalyst.totalSupply();
    const balanceBeforeBurning = await rareCatalyst.balanceOf(users[5]);

    const balanceBeforeBurningPowerGem = await powerGem.balanceOf(users[5]);
    const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(users[5]);
    const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();

    const sandBalanceFromBefore = await sandContract.balanceOf(users[5]);
    const sandBalanceToBefore = await sandContract.balanceOf(feeRecipient);
    await changeCatalyst(
      assetUpgraderContract,
      users[5],
      assetId,
      catalystId,
      [powerGemId, defenseGemId],
      users[2]
    );
    const sandBalanceFromAfter = await sandContract.balanceOf(users[5]);
    const sandBalanceToAfter = await sandContract.balanceOf(feeRecipient);

    const totalSupplyAfterRareCatalyst = await rareCatalyst.totalSupply();
    const balanceAfterBurningRareCatalyst = await rareCatalyst.balanceOf(
      users[5]
    );
    const balanceAfterBurningPowerGem = await powerGem.balanceOf(users[5]);
    const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(users[5]);
    const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();
    // check catalyst burn
    expect(balanceAfterBurningRareCatalyst).to.equal(
      balanceBeforeBurning.sub(GEM_CATALYST_UNIT)
    );
    expect(totalSupplyAfterRareCatalyst).to.equal(
      totalSupplyBeforeRareCatalyst.sub(GEM_CATALYST_UNIT)
    );
    // check gem burn
    expect(balanceAfterBurningPowerGem).to.equal(
      balanceBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
    );
    expect(balanceAfterBurningDefenseGem).to.equal(
      balanceBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
    );
    expect(totalSupplyAfterBurningPowerGem).to.equal(
      totalSupplyBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
    );
    expect(totalSupplyAfterBurningDefenseGem).to.equal(
      totalSupplyBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
    );
    // check sand fee transfer
    expect(sandBalanceFromAfter).to.equal(
      sandBalanceFromBefore.sub(upgradeFee)
    );
    expect(sandBalanceToAfter).to.equal(sandBalanceToBefore.add(upgradeFee));
    // check assetAttributesRegistry
    const record = await assetAttributesRegistry.getRecord(assetId);
    expect(record.catalystId).to.equal(catalystId);
    expect(record.exists).to.equal(true);
    // check asset transfer
    const newOwner = await assetContract.callStatic.ownerOf(assetId);
    expect(newOwner).to.equal(users[2]);
  });

  it('adding powerGem and defenseGem to a rareCatalyst with no gems', async function () {
    const {
      assetUpgraderContract,
      assetAttributesRegistry,
      sandContract,
      assetContract,
      feeRecipient,
      rareCatalyst,
      powerGem,
      defenseGem,
      upgradeFee,
      gemsCatalystsUnit,
      gemsCatalystsRegistry,
    } = await setupAssetUpgrader();

    const users = await getUnnamedAccounts();
    await transferSand(
      sandContract,
      users[4],
      BigNumber.from('2').mul(upgradeFee)
    );
    const mintingAmount = BigNumber.from('8').mul(
      BigNumber.from(gemsCatalystsUnit)
    );
    await mintCatalyst(rareCatalyst, mintingAmount, users[4]);
    await mintGem(powerGem, mintingAmount, users[4]);
    await mintGem(defenseGem, mintingAmount, users[4]);
    const assetId = await mintAsset(users[4], 1);
    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();
    const catalystId = await rareCatalyst.catalystId();

    const balanceBeforeBurningPowerGem = await powerGem.balanceOf(users[4]);
    const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(users[4]);
    const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();
    const sandBalanceFromBefore = await sandContract.balanceOf(users[4]);
    const sandBalanceToBefore = await sandContract.balanceOf(feeRecipient);
    const gemIds = [powerGemId, defenseGemId];
    await waitFor(
      powerGem
        .connect(ethers.provider.getSigner(users[4]))
        .approve(gemsCatalystsRegistry.address, 100000000000000)
    );
    await waitFor(
      defenseGem
        .connect(ethers.provider.getSigner(users[4]))
        .approve(gemsCatalystsRegistry.address, 100000000000000)
    );

    await changeCatalyst(
      assetUpgraderContract,
      users[4],
      assetId,
      catalystId,
      [],
      users[4]
    );
    await waitFor(
      assetUpgraderContract
        .connect(ethers.provider.getSigner(users[4]))
        .addGems(users[4], assetId, gemIds, users[4])
    );

    const balanceAfterBurningPowerGem = await powerGem.balanceOf(users[4]);
    const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(users[4]);
    const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();
    const sandBalanceFromAfter = await sandContract.balanceOf(users[4]);
    const sandBalanceToAfter = await sandContract.balanceOf(feeRecipient);

    // check gem burn
    expect(balanceAfterBurningPowerGem).to.equal(
      balanceBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
    );
    expect(balanceAfterBurningDefenseGem).to.equal(
      balanceBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
    );
    expect(totalSupplyAfterBurningPowerGem).to.equal(
      totalSupplyBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
    );
    expect(totalSupplyAfterBurningDefenseGem).to.equal(
      totalSupplyBeforeBurningDefenseGem.sub(GEM_CATALYST_UNIT)
    );

    // check sand fee transfer
    expect(sandBalanceFromAfter).to.equal(
      sandBalanceFromBefore.sub(upgradeFee)
    );
    expect(sandBalanceToAfter).to.equal(sandBalanceToBefore.add(upgradeFee));

    // check assetAttributesRegistry
    const record = await assetAttributesRegistry.getRecord(assetId);
    const zeroPaddedArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(record.catalystId).to.equal(catalystId);
    expect(record.exists).to.equal(true);
    expect(record.gemIds).to.eql([...gemIds, ...zeroPaddedArray]);
    // check asset transfer
    const newOwner = await assetContract.callStatic.ownerOf(assetId);
    expect(newOwner).to.equal(users[4]);
  });
});
