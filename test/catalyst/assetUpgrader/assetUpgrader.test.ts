import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../../chai-setup';
import {setupAssetUpgrader} from './fixtures';
import {_setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';
import {waitFor} from '../../utils';
import {Contract} from 'ethers';

const GEM_CATALYST_UNIT = BigNumber.from('1000000000000000000');

describe('AssetUpgrader', function () {
  async function mintAsset(minter: string, supply: number) {
    const {assetBouncerAdmin} = await getNamedAccounts();
    const assetContract = await ethers.getContract('Asset');

    await waitFor(
      assetContract
        .connect(ethers.provider.getSigner(assetBouncerAdmin))
        .setBouncer(assetBouncerAdmin, true)
    );

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

    await waitFor(
      assetContract
        .connect(ethers.provider.getSigner(assetBouncerAdmin))
        .mint(
          minter,
          22,
          '0x1111111111111111111111111111111111111111111111111111111111111111',
          supply,
          0,
          minter,
          Buffer.from('data')
        )
    );
    return assetId;
  }
  async function changeCatalyst(
    assetUpgraderContract: Contract,
    from: string,
    assetId: string,
    catalystId: string,
    gemsIds: string[],
    to: string
  ) {
    await waitFor(
      assetUpgraderContract
        .connect(ethers.provider.getSigner(from))
        .changeCatalyst(from, assetId, catalystId, gemsIds, to)
    );
  }
  async function transferSand(
    sandContract: Contract,
    to: string,
    amount: BigNumber
  ) {
    const {sandBeneficiary} = await getNamedAccounts();
    await waitFor(
      sandContract
        .connect(ethers.provider.getSigner(sandBeneficiary))
        .transfer(to, amount)
    );
  }
  async function mintCatalyst(
    catalystContract: Contract,
    mintingAmount: BigNumber,
    beneficiary: string
  ) {
    // const gemsCatalystsUnit = '1000000000000000000';
    // const mintingAmount = BigNumber.from('8').mul(
    //   BigNumber.from(gemsCatalystsUnit)
    // );
    const {catalystMinter} = await getNamedAccounts();

    await waitFor(
      catalystContract
        .connect(ethers.provider.getSigner(catalystMinter))
        .mint(beneficiary, mintingAmount)
    );
  }
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
    } = await setupAssetUpgrader();
    const {
      rareCatalyst,
      catalystOwner,
      powerGem,
      defenseGem,
    } = await _setupGemsAndCatalysts();

    const users = await getUnnamedAccounts();
    const assetId = await mintAsset(catalystOwner, 1);
    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();

    const catalystId = await rareCatalyst.catalystId();
    const totalSupplyBeforeRareCatalyst = await rareCatalyst.totalSupply();
    const balanceBeforeBurning = await rareCatalyst.balanceOf(catalystOwner);

    const balanceBeforeBurningPowerGem = await powerGem.balanceOf(
      catalystOwner
    );
    const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(
      catalystOwner
    );
    const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();

    const sandBalanceFromBefore = await sandContract.balanceOf(catalystOwner);
    const sandBalanceToBefore = await sandContract.balanceOf(feeRecipient);
    await changeCatalyst(
      assetUpgraderContract,
      catalystOwner,
      assetId,
      catalystId,
      [powerGemId, defenseGemId],
      users[2]
    );
    const sandBalanceFromAfter = await sandContract.balanceOf(catalystOwner);
    const sandBalanceToAfter = await sandContract.balanceOf(feeRecipient);

    const totalSupplyAfterRareCatalyst = await rareCatalyst.totalSupply();
    const balanceAfterBurningRareCatalyst = await rareCatalyst.balanceOf(
      catalystOwner
    );
    const balanceAfterBurningPowerGem = await powerGem.balanceOf(catalystOwner);
    const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(
      catalystOwner
    );
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
      upgradeFee,
    } = await setupAssetUpgrader();
    const {
      gemsCatalystsRegistry,
      rareCatalyst,
      catalystOwner,
      powerGem,
      defenseGem,
    } = await _setupGemsAndCatalysts();

    const assetId = await mintAsset(catalystOwner, 1);
    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();
    const catalystId = await rareCatalyst.catalystId();

    const balanceBeforeBurningPowerGem = await powerGem.balanceOf(
      catalystOwner
    );
    const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(
      catalystOwner
    );
    const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();
    const sandBalanceFromBefore = await sandContract.balanceOf(catalystOwner);
    const sandBalanceToBefore = await sandContract.balanceOf(feeRecipient);
    const gemIds = [powerGemId, defenseGemId];
    await waitFor(
      powerGem
        .connect(ethers.provider.getSigner(catalystOwner))
        .approve(gemsCatalystsRegistry.address, 100000000000000)
    );
    await waitFor(
      defenseGem
        .connect(ethers.provider.getSigner(catalystOwner))
        .approve(gemsCatalystsRegistry.address, 100000000000000)
    );

    await changeCatalyst(
      assetUpgraderContract,
      catalystOwner,
      assetId,
      catalystId,
      [],
      catalystOwner
    );
    await waitFor(
      assetUpgraderContract
        .connect(ethers.provider.getSigner(catalystOwner))
        .addGems(catalystOwner, assetId, gemIds, catalystOwner)
    );

    const balanceAfterBurningPowerGem = await powerGem.balanceOf(catalystOwner);
    const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(
      catalystOwner
    );
    const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();
    const sandBalanceFromAfter = await sandContract.balanceOf(catalystOwner);
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
    expect(newOwner).to.equal(catalystOwner);
  });

  it('ba', async function () {});
});
