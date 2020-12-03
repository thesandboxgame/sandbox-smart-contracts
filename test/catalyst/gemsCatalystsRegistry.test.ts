import {ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../chai-setup';
import {setupGemsAndCatalysts} from './fixtures';
describe('GemsCatalystsRegistry', function () {
  it('getMaxGems for catalystId = 1 should be 1', async function () {
    const {
      gemsCatalystsRegistry,
      commonCatalyst,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const maxGems = await gemsCatalystsRegistry.getMaxGems(catalystId);
    expect(maxGems).to.equal(1);
  });

  it('getMaxGems for non existing catalystId should fail', async function () {
    const {gemsCatalystsRegistry} = await setupGemsAndCatalysts();
    expect(gemsCatalystsRegistry.getMaxGems(10)).to.be.revertedWith(
      'CATALYST_DOES_NOT_EXIST'
    );
  });

  it('burnCatalyst should burn 2 common catalysts from catalystOwner account', async function () {
    const {
      gemsCatalystsRegistry,
      commonCatalyst,
      catalystOwner,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const totalSupplyBefore = await commonCatalyst.totalSupply();
    const balanceBeforeBurning = await commonCatalyst.balanceOf(catalystOwner);
    const burnAmount = BigNumber.from('2');
    await gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(catalystOwner))
      .burnCatalyst(catalystOwner, catalystId, burnAmount);
    const totalSupplyAfter = await commonCatalyst.totalSupply();
    const balanceAfterBurning = await commonCatalyst.balanceOf(catalystOwner);
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
    expect(totalSupplyAfter).to.equal(totalSupplyBefore.sub(burnAmount));
  });

  it('burnCatalyst should fail for non existing catalystId', async function () {
    const {
      gemsCatalystsRegistry,
      gemsCatalystsRegistryAdmin,
    } = await setupGemsAndCatalysts();
    const burnAmount = BigNumber.from('2');
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
        .burnCatalyst(gemsCatalystsRegistryAdmin, 101, burnAmount)
    ).to.be.revertedWith('CATALYST_DOES_NOT_EXIST');
  });

  it('burnCatalyst should fail for insufficient amount', async function () {
    const {
      gemsCatalystsRegistry,
      commonCatalyst,
      catalystMinter,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from('200');
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(catalystMinter))
        .burnCatalyst(catalystMinter, catalystId, burnAmount)
    ).to.be.revertedWith('Not enough funds');
  });

  it('burnCatalyst should fail for account with no gems', async function () {
    const {
      gemsCatalystsRegistry,
      commonCatalyst,
    } = await setupGemsAndCatalysts();
    const others = await getUnnamedAccounts();
    const catalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from('200');
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(others[0]))
        .burnGem(others[0], catalystId, burnAmount)
    ).to.be.revertedWith('Not enough funds');
  });

  it('burnGem should burn 3 power gems from gemOwner account', async function () {
    const {
      gemsCatalystsRegistry,
      powerGem,
      gemOwner,
    } = await setupGemsAndCatalysts();
    const gemId = await powerGem.gemId();
    const totalSupplyBefore = await powerGem.totalSupply();
    const balanceBeforeBurning = await powerGem.balanceOf(gemOwner);
    const burnAmount = BigNumber.from('3');
    await gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(gemOwner))
      .burnGem(gemOwner, gemId, burnAmount);
    const balanceAfterBurning = await powerGem.balanceOf(gemOwner);
    const totalSupplyAfter = await powerGem.totalSupply();
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
    expect(totalSupplyAfter).to.equal(totalSupplyBefore.sub(burnAmount));
  });

  it('burnGem should fail for non existing gemId', async function () {
    const {gemsCatalystsRegistry, gemMinter} = await setupGemsAndCatalysts();
    const burnAmount = BigNumber.from('2');
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(gemMinter))
        .burnGem(gemMinter, 101, burnAmount)
    ).to.be.revertedWith('GEM_DOES_NOT_EXIST');
  });

  it('burnGem should fail for insufficient amount', async function () {
    const {
      gemsCatalystsRegistry,
      powerGem,
      gemMinter,
    } = await setupGemsAndCatalysts();
    const gemId = await powerGem.gemId();
    const burnAmount = BigNumber.from('200');
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(gemMinter))
        .burnGem(gemMinter, gemId, burnAmount)
    ).to.be.revertedWith('Not enough funds');
  });

  it('burnGem should fail for account with no gems', async function () {
    const {gemsCatalystsRegistry, powerGem} = await setupGemsAndCatalysts();
    const others = await getUnnamedAccounts();
    const gemId = await powerGem.gemId();
    const burnAmount = BigNumber.from('200');
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(others[0]))
        .burnGem(others[0], gemId, burnAmount)
    ).to.be.revertedWith('Not enough funds');
  });

  it('addGemsAndCatalysts should fail for existing gemId', async function () {
    const {
      gemsCatalystsRegistry,
      powerGem,
      commonCatalyst,
      gemsCatalystsRegistryAdmin,
    } = await setupGemsAndCatalysts();
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
        .addGemsAndCatalysts([powerGem.address], [commonCatalyst.address])
    ).to.be.revertedWith('GEM_ID_NOT_IN_ORDER');
  });

  it('addGemsAndCatalysts should fail for existing catalystd', async function () {
    const {
      gemsCatalystsRegistry,
      commonCatalyst,
      gemsCatalystsRegistryAdmin,
    } = await setupGemsAndCatalysts();
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
        .addGemsAndCatalysts([], [commonCatalyst.address])
    ).to.be.revertedWith('CATALYST_ID_NOT_IN_ORDER');
  });

  it('addGemsAndCatalysts should add gemExample', async function () {
    const {
      gemsCatalystsRegistry,
      gemExample,
      gemsCatalystsRegistryAdmin,
    } = await setupGemsAndCatalysts();
    const tx = await gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
      .addGemsAndCatalysts([gemExample.address], []);
    await tx.wait();
    const gemId = await gemExample.gemId();
    expect(await gemsCatalystsRegistry.isGemExists(gemId)).to.equal(true);
  });

  it('addGemsAndCatalysts should add catalystExample', async function () {
    const {
      gemsCatalystsRegistry,
      catalystExample,
      gemsCatalystsRegistryAdmin,
    } = await setupGemsAndCatalysts();
    const tx = await gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
      .addGemsAndCatalysts([], [catalystExample.address]);
    await tx.wait();
    const catalystId = await catalystExample.catalystId();
    expect(await gemsCatalystsRegistry.isCatalystExists(catalystId)).to.equal(
      true
    );
  });

  it('addGemsAndCatalysts should fail for gem id not in order', async function () {
    const {
      gemsCatalystsRegistry,
      gemNotInOrder,
      gemsCatalystsRegistryAdmin,
    } = await setupGemsAndCatalysts();
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
        .addGemsAndCatalysts([gemNotInOrder.address], [])
    ).to.be.revertedWith('GEM_ID_NOT_IN_ORDER');
  });

  it('addGemsAndCatalysts should fail for unauthorized user', async function () {
    const {gemsCatalystsRegistry, gemExample} = await setupGemsAndCatalysts();
    const others = await getUnnamedAccounts();
    expect(
      gemsCatalystsRegistry
        .connect(ethers.provider.getSigner(others[0]))
        .addGemsAndCatalysts([gemExample.address], [])
    ).to.be.revertedWith('GEM_ID_NOT_IN_ORDER');
  });

  it('burnDifferentGems for two different gem tokens', async function () {
    const {
      gemsCatalystsRegistry,
      powerGem,
      defenseGem,
      gemOwner,
    } = await setupGemsAndCatalysts();
    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();
    const balanceBeforeBurningPowerGem = await powerGem.balanceOf(gemOwner);
    const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(gemOwner);
    const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();
    await gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(gemOwner))
      .burnDifferentGems(gemOwner, [defenseGemId, powerGemId]);
    const balanceAfterBurningPowerGem = await powerGem.balanceOf(gemOwner);
    const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(gemOwner);
    const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();
    const burnAmount = BigNumber.from('1');
    expect(balanceAfterBurningPowerGem).to.equal(
      balanceBeforeBurningPowerGem.sub(burnAmount)
    );
    expect(balanceAfterBurningDefenseGem).to.equal(
      balanceBeforeBurningDefenseGem.sub(burnAmount)
    );
    expect(totalSupplyAfterBurningPowerGem).to.equal(
      totalSupplyBeforeBurningPowerGem.sub(burnAmount)
    );
    expect(totalSupplyAfterBurningDefenseGem).to.equal(
      totalSupplyBeforeBurningDefenseGem.sub(burnAmount)
    );
  });

  it('burnDifferentCatalysts for two different catalyst tokens', async function () {
    const {
      gemsCatalystsRegistry,
      rareCatalyst,
      commonCatalyst,
      catalystOwner,
    } = await setupGemsAndCatalysts();
    const rareCatalystId = await rareCatalyst.catalystId();
    const commonCatalystId = await commonCatalyst.catalystId();
    const balanceBeforeBurningRareCatalyst = await rareCatalyst.balanceOf(
      catalystOwner
    );
    const balanceBeforeBurningCommonCatalyst = await commonCatalyst.balanceOf(
      catalystOwner
    );
    const totalSupplyBeforeBurningRareCatalyst = await rareCatalyst.totalSupply();
    const totalSupplyBeforeBurningDefenseGem = await commonCatalyst.totalSupply();
    await gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(catalystOwner))
      .burnDifferentCatalysts(catalystOwner, [
        rareCatalystId,
        commonCatalystId,
      ]);
    const balanceAfterBurningRareCatalyst = await rareCatalyst.balanceOf(
      catalystOwner
    );
    const balanceAfterBurningCommonCatalyst = await commonCatalyst.balanceOf(
      catalystOwner
    );
    const totalSupplyAfterBurningRareCatalyst = await rareCatalyst.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await commonCatalyst.totalSupply();
    const burnAmount = BigNumber.from('1');
    expect(balanceAfterBurningRareCatalyst).to.equal(
      balanceBeforeBurningRareCatalyst.sub(burnAmount)
    );
    expect(balanceAfterBurningCommonCatalyst).to.equal(
      balanceBeforeBurningCommonCatalyst.sub(burnAmount)
    );
    expect(totalSupplyAfterBurningRareCatalyst).to.equal(
      totalSupplyBeforeBurningRareCatalyst.sub(burnAmount)
    );
    expect(totalSupplyAfterBurningDefenseGem).to.equal(
      totalSupplyBeforeBurningDefenseGem.sub(burnAmount)
    );
  });

  it('batchBurnGems for two different gem tokens and two different amounts', async function () {
    const {
      gemsCatalystsRegistry,
      powerGem,
      defenseGem,
      gemOwner,
    } = await setupGemsAndCatalysts();
    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();
    const balanceBeforeBurningPowerGem = await powerGem.balanceOf(gemOwner);
    const balanceBeforeBurningDefenseGem = await defenseGem.balanceOf(gemOwner);
    const totalSupplyBeforeBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyBeforeBurningDefenseGem = await defenseGem.totalSupply();
    const burnAmounts = [BigNumber.from('4'), BigNumber.from('6')];
    await gemsCatalystsRegistry
      .connect(ethers.provider.getSigner(gemOwner))
      .batchBurnGems(gemOwner, [defenseGemId, powerGemId], burnAmounts);
    const balanceAfterBurningPowerGem = await powerGem.balanceOf(gemOwner);
    const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(gemOwner);
    const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();
    expect(balanceAfterBurningPowerGem).to.equal(
      balanceBeforeBurningPowerGem.sub(burnAmounts[1])
    );
    expect(balanceAfterBurningDefenseGem).to.equal(
      balanceBeforeBurningDefenseGem.sub(burnAmounts[0])
    );
    expect(totalSupplyAfterBurningPowerGem).to.equal(
      totalSupplyBeforeBurningPowerGem.sub(burnAmounts[1])
    );
    expect(totalSupplyAfterBurningDefenseGem).to.equal(
      totalSupplyBeforeBurningDefenseGem.sub(burnAmounts[0])
    );
  });
});
