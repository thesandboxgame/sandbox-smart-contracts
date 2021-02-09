import { ethers } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from '../../chai-setup';
import { setupAssetUpgrader } from './fixtures';
import { waitFor } from '../../utils';
import {
  changeCatalyst,
  mintAsset,
  mintCatalyst,
  mintGem,
  transferSand,
} from '../utils';

const GEM_CATALYST_UNIT = BigNumber.from('1000000000000000000');

describe('AssetUpgrader', function () {
  it('extractAndSetCatalyst for FT with rareCatalyst and powerGem, no ownership change', async function () {
    const {
      catalystOwner,
      upgradeFee,
      assetUpgraderContract,
      assetAttributesRegistry,
      assetContract,
      sandContract,
      feeRecipient,
      rareCatalyst,
      powerGem,
      gemsCatalystsUnit,
    } = await setupAssetUpgrader();
    const catalystId = await rareCatalyst.catalystId();
    const mintingAmount = BigNumber.from('8').mul(
      BigNumber.from(gemsCatalystsUnit)
    );
    await mintCatalyst(rareCatalyst, mintingAmount, catalystOwner);
    await mintGem(powerGem, mintingAmount, catalystOwner);

    const powerGemId = await powerGem.gemId();

    const totalSupplyBeforeRareCatalyst = await rareCatalyst.totalSupply();
    const balanceBeforeBurning = await rareCatalyst.balanceOf(catalystOwner);

    const balanceBeforeBurningPowerGem = await powerGem.balanceOf(
      catalystOwner
    );
    const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();

    const sandBalanceFromBefore = await sandContract.balanceOf(catalystOwner);
    const sandBalanceToBefore = await sandContract.balanceOf(feeRecipient);
    const assetSupply = BigNumber.from('3');
    const assetId = await mintAsset(
      catalystOwner,
      BigNumber.from('22'),
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      assetSupply,
      0,
      catalystOwner,
      Buffer.from('ff')
    );
    const tokenId = await assetUpgraderContract
      .connect(ethers.provider.getSigner(catalystOwner))
      .callStatic.extractAndSetCatalyst(
        catalystOwner,
        assetId,
        catalystId,
        [powerGemId],
        catalystOwner
      );
    await waitFor(
      assetUpgraderContract
        .connect(ethers.provider.getSigner(catalystOwner))
        .extractAndSetCatalyst(
          catalystOwner,
          assetId,
          catalystId,
          [powerGemId],
          catalystOwner
        )
    );
    const balanceOldAsset = await assetContract['balanceOf(address,uint256)'](
      catalystOwner,
      assetId
    );
    const sandBalanceFromAfter = await sandContract.balanceOf(catalystOwner);
    const sandBalanceToAfter = await sandContract.balanceOf(feeRecipient);

    const totalSupplyAfterRareCatalyst = await rareCatalyst.totalSupply();
    const balanceAfterBurningRareCatalyst = await rareCatalyst.balanceOf(
      catalystOwner
    );
    const balanceAfterBurningPowerGem = await powerGem.balanceOf(catalystOwner);
    const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();

    // check erc1155 burn
    expect(balanceOldAsset).to.equal(assetSupply.sub(BigNumber.from('1')));
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
    expect(totalSupplyAfterBurningPowerGem).to.equal(
      totalSupplyBeforeBurningPowerGem.sub(GEM_CATALYST_UNIT)
    );
    // check sand fee transfer
    expect(sandBalanceFromAfter).to.equal(
      sandBalanceFromBefore.sub(upgradeFee)
    );
    expect(sandBalanceToAfter).to.equal(sandBalanceToBefore.add(upgradeFee));
    // check assetAttributesRegistry
    const record = await assetAttributesRegistry.getRecord(tokenId);
    expect(record.catalystId).to.equal(catalystId);
    expect(record.exists).to.equal(true);
    // check asset transfer
    const newOwner = await assetContract.callStatic.ownerOf(tokenId);
    expect(newOwner).to.equal(catalystOwner);
  });
  it('extractAndSetCatalyst should fail for NFT', async function () {
    const {
      catalystOwner,
      assetUpgraderContract,
      rareCatalyst,
      powerGem,
      gemsCatalystsUnit,
    } = await setupAssetUpgrader();
    const catalystId = await rareCatalyst.catalystId();
    const mintingAmount = BigNumber.from('8').mul(
      BigNumber.from(gemsCatalystsUnit)
    );
    await mintCatalyst(rareCatalyst, mintingAmount, catalystOwner);
    await mintGem(powerGem, mintingAmount, catalystOwner);

    const powerGemId = await powerGem.gemId();

    const assetId = await mintAsset(
      catalystOwner,
      BigNumber.from('22'),
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      1,
      0,
      catalystOwner,
      Buffer.from('ff')
    );
    await expect(
      assetUpgraderContract
        .connect(ethers.provider.getSigner(catalystOwner))
        .extractAndSetCatalyst(
          catalystOwner,
          assetId,
          catalystId,
          [powerGemId],
          catalystOwner
        )
    ).to.be.revertedWith(`Not an ERC1155 Token`);
  });
  it('setting a rareCatalyst with powerGem and defenseGem', async function () {
    const {
      users,
      upgradeFee,
      assetUpgraderContract,
      assetAttributesRegistry,
      assetContract,
      sandContract,
      feeRecipient,
      rareCatalyst,
      powerGem,
      defenseGem,
      gemsCatalystsUnit,
    } = await setupAssetUpgrader();

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
    const assetId = await mintAsset(
      users[5],
      BigNumber.from('22'),
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      1,
      0,
      users[5],
      Buffer.from('ff')
    );
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
      users,
      assetUpgraderContract,
      assetAttributesRegistry,
      sandContract,
      assetContract,
      feeRecipient,
      rareCatalyst,
      powerGem,
      defenseGem,
      gemAdditionFee,
      gemsCatalystsUnit,
      gemsCatalystsRegistry,
    } = await setupAssetUpgrader();

    await transferSand(
      sandContract,
      users[4],
      BigNumber.from('2').mul(gemAdditionFee)
    );
    const mintingAmount = BigNumber.from('8').mul(
      BigNumber.from(gemsCatalystsUnit)
    );
    await mintCatalyst(rareCatalyst, mintingAmount, users[4]);
    await mintGem(powerGem, mintingAmount, users[4]);
    await mintGem(defenseGem, mintingAmount, users[4]);
    const assetId = await mintAsset(
      users[4],
      BigNumber.from('22'),
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      1,
      0,
      users[4],
      Buffer.from('ff')
    );
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
      sandBalanceFromBefore.sub(gemAdditionFee)
    );
    expect(sandBalanceToAfter).to.equal(
      sandBalanceToBefore.add(gemAdditionFee)
    );

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
  it('setting a rareCatalyst where ownerOf(assetId)!= msg.sender should fail', async function () {
    const {
      users,
      upgradeFee,
      assetUpgraderContract,
      sandContract,
      rareCatalyst,
      powerGem,
      defenseGem,
      gemsCatalystsUnit,
    } = await setupAssetUpgrader();

    await transferSand(
      sandContract,
      users[5],
      BigNumber.from('2').mul(upgradeFee)
    );

    await transferSand(
      sandContract,
      users[10],
      BigNumber.from('2').mul(upgradeFee)
    );

    const assetId = await mintAsset(
      users[5],
      BigNumber.from('22'),
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      1,
      0,
      users[5],
      Buffer.from('ff')
    );

    const mintingAmount = BigNumber.from('8').mul(
      BigNumber.from(gemsCatalystsUnit)
    );
    await mintCatalyst(rareCatalyst, mintingAmount, users[10]);
    await mintGem(powerGem, mintingAmount, users[10]);
    await mintGem(defenseGem, mintingAmount, users[10]);

    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();
    const catalystId = await rareCatalyst.catalystId();

    await expect(
      assetUpgraderContract
        .connect(ethers.provider.getSigner(users[10]))
        .changeCatalyst(users[10], assetId, catalystId, [powerGemId, defenseGemId], users[10])
    ).to.be.revertedWith('NOT_AUTHORIZED_ASSET_OWNER');

  });
});
