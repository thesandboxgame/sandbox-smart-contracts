import {BigNumber} from '@ethersproject/bignumber';
import {constants} from 'ethers';
import {expect} from '../../../chai-setup';
import {waitFor, withSnapshot, expectEventWithArgs} from '../../../utils';
import catalysts from '../../../../data/catalysts';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';
import {deployments} from 'hardhat';
import {zeroAddress} from '../../../land/fixtures';

const setupGemsAndCatalysts = withSnapshot(
  [
    'PolygonGemsCatalystsRegistry',
    'PolygonCatalysts',
    'PolygonSand',
    'PolygonGems',
    'PolygonGemsCatalystsRegistry_setup',
  ],
  gemsAndCatalystsFixtures
);

describe('GemsCatalystsRegistry', function () {
  it('getMaxGems for commonCatalyst should be 1', async function () {
    const {
      gemsCatalystsRegistry,
      commonCatalyst,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const maxGems = await gemsCatalystsRegistry.getMaxGems(catalystId);
    expect(maxGems).to.equal(catalysts[0].maxGems);
  });

  it('can get decimals', async function () {
    const {
      gemsCatalystsRegistry,
      commonCatalyst,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const decimals = await gemsCatalystsRegistry.getCatalystDecimals(
      catalystId
    );
    expect(decimals).to.equal(18);
  });

  it('getMaxGems for non existing catalystId should fail', async function () {
    const {gemsCatalystsRegistry} = await setupGemsAndCatalysts();
    await expect(gemsCatalystsRegistry.getMaxGems(10)).to.be.revertedWith(
      'CATALYST_DOES_NOT_EXIST'
    );
  });

  it('burnCatalyst should burn 2 common catalysts from catalystOwner account', async function () {
    const {
      gemsCatalystsRegistryAsCatalystOwner,
      commonCatalyst,
      catalystOwner,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const totalSupplyBefore = await commonCatalyst.totalSupply();
    const balanceBeforeBurning = await commonCatalyst.balanceOf(catalystOwner);

    //approving all
    await gemsCatalystsRegistryAsCatalystOwner.setGemsAndCatalystsMaxAllowance();

    const burnAmount = BigNumber.from('2');
    await waitFor(
      gemsCatalystsRegistryAsCatalystOwner.burnCatalyst(
        catalystOwner,
        catalystId,
        burnAmount
      )
    );
    const totalSupplyAfter = await commonCatalyst.totalSupply();
    const balanceAfterBurning = await commonCatalyst.balanceOf(catalystOwner);
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
    expect(totalSupplyAfter).to.equal(totalSupplyBefore.sub(burnAmount));
  });

  it('Allow max value allowance for every gems and catalyst', async function () {
    const {
      gemsCatalystsRegistryAsUser3,
      gemsCatalystsRegistry,
      commonCatalyst,
      rareCatalyst,
      epicCatalyst,
      legendaryCatalyst,
      powerGem,
      defenseGem,
      speedGem,
      magicGem,
      luckGem,
      user3,
    } = await setupGemsAndCatalysts();

    const receipt = await waitFor(
      gemsCatalystsRegistryAsUser3.setGemsAndCatalystsMaxAllowance()
    );

    const event = await expectEventWithArgs(
      gemsCatalystsRegistry,
      receipt,
      'SetGemsAndCatalystsAllowance'
    );
    expect(event.args[0]).to.be.equal(user3);
    expect(event.args[1]).to.be.equal(constants.MaxUint256);

    expect(
      await commonCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await rareCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await epicCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await legendaryCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await powerGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await defenseGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await speedGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await magicGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    expect(
      await luckGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(
      BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
  });

  it('Allow 0 allowance for every gems and catalyst', async function () {
    const {
      gemsCatalystsRegistryAsUser3,
      gemsCatalystsRegistry,
      commonCatalyst,
      rareCatalyst,
      epicCatalyst,
      legendaryCatalyst,
      powerGem,
      defenseGem,
      speedGem,
      magicGem,
      luckGem,
      user3,
    } = await setupGemsAndCatalysts();

    await gemsCatalystsRegistryAsUser3.setGemsAndCatalystsMaxAllowance();
    await gemsCatalystsRegistryAsUser3.revokeGemsandCatalystsMaxAllowance();

    expect(
      await commonCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await rareCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await epicCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await legendaryCatalyst.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await powerGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await defenseGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await speedGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await magicGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
    expect(
      await luckGem.allowance(user3, gemsCatalystsRegistry.address)
    ).to.equal(BigNumber.from(0));
  });

  it('burnCatalyst should fail for unauthorized account', async function () {
    const {
      gemsCatalystsRegistryAsUser3,
      commonCatalyst,
      catalystOwner,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from('2');
    await expect(
      gemsCatalystsRegistryAsUser3.burnCatalyst(
        catalystOwner,
        catalystId,
        burnAmount
      )
    ).to.be.revertedWith('AUTH_ACCESS_DENIED');
  });

  it('burnCatalyst should fail for non existing catalystId', async function () {
    const {
      gemsCatalystsRegistryAdmin,
      gemsCatalystsRegistryAsRegAdmin,
    } = await setupGemsAndCatalysts();
    const burnAmount = BigNumber.from('2');

    await expect(
      gemsCatalystsRegistryAsRegAdmin.burnCatalyst(
        gemsCatalystsRegistryAdmin,
        101,
        burnAmount
      )
    ).to.be.revertedWith('CATALYST_DOES_NOT_EXIST');
  });

  it('burnCatalyst should fail for insufficient amount', async function () {
    const {
      gemsCatalystsRegistryAsCatalystMinter,
      commonCatalyst,
      catalystMinter,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from('200');

    //approving
    await gemsCatalystsRegistryAsCatalystMinter.setGemsAndCatalystsMaxAllowance();

    await expect(
      gemsCatalystsRegistryAsCatalystMinter.burnCatalyst(
        catalystMinter,
        catalystId,
        burnAmount
      )
    ).to.be.revertedWith('INSUFFICIENT_FUNDS');
  });

  it('burnCatalyst should fail for account with no gems', async function () {
    const {
      user3,
      gemsCatalystsRegistryAsUser3,
      commonCatalyst,
    } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from('200');

    //making approve
    await gemsCatalystsRegistryAsUser3.setGemsAndCatalystsMaxAllowance();

    await expect(
      gemsCatalystsRegistryAsUser3.burnGem(user3, catalystId, burnAmount)
    ).to.be.revertedWith('INSUFFICIENT_FUNDS');
  });

  it('burnGem should burn 3 power gems from gemOwner account', async function () {
    const {
      gemsCatalystsRegistryAsGemOwner,
      powerGem,
      gemOwner,
    } = await setupGemsAndCatalysts();
    const gemId = await powerGem.gemId();
    const totalSupplyBefore = await powerGem.totalSupply();
    const balanceBeforeBurning = await powerGem.balanceOf(gemOwner);
    const burnAmount = BigNumber.from('3');

    //approving
    await gemsCatalystsRegistryAsGemOwner.setGemsAndCatalystsMaxAllowance();

    await waitFor(
      gemsCatalystsRegistryAsGemOwner.burnGem(gemOwner, gemId, burnAmount)
    );
    const balanceAfterBurning = await powerGem.balanceOf(gemOwner);
    const totalSupplyAfter = await powerGem.totalSupply();
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
    expect(totalSupplyAfter).to.equal(totalSupplyBefore.sub(burnAmount));
  });

  it('burnGem should fail for unauthorized account', async function () {
    const {
      gemsCatalystsRegistryAsUser3,
      powerGem,
      gemOwner,
    } = await setupGemsAndCatalysts();
    const gemId = await powerGem.gemId();
    const burnAmount = BigNumber.from('2');
    await expect(
      gemsCatalystsRegistryAsUser3.burnGem(gemOwner, gemId, burnAmount)
    ).to.be.revertedWith('AUTH_ACCESS_DENIED');
  });
  it('burnGem should fail for non existing gemId', async function () {
    const {
      gemsCatalystsRegistryAsGemMinter,
      gemMinter,
    } = await setupGemsAndCatalysts();
    const burnAmount = BigNumber.from('2');
    await expect(
      gemsCatalystsRegistryAsGemMinter.burnGem(gemMinter, 101, burnAmount)
    ).to.be.revertedWith('GEM_DOES_NOT_EXIST');
  });

  it('burnGem should fail for insufficient amount', async function () {
    const {
      gemsCatalystsRegistryAsGemMinter,
      powerGem,
      gemMinter,
    } = await setupGemsAndCatalysts();
    const gemId = await powerGem.gemId();
    const burnAmount = BigNumber.from('200');

    //making approve
    await gemsCatalystsRegistryAsGemMinter.setGemsAndCatalystsMaxAllowance();

    await expect(
      gemsCatalystsRegistryAsGemMinter.burnGem(gemMinter, gemId, burnAmount)
    ).to.be.revertedWith('INSUFFICIENT_FUNDS');
  });

  it('burnGem should fail for account with no gems', async function () {
    const {
      user3,
      gemsCatalystsRegistryAsUser3,
      powerGem,
    } = await setupGemsAndCatalysts();
    const gemId = await powerGem.gemId();
    const burnAmount = BigNumber.from('200');

    //approving
    gemsCatalystsRegistryAsUser3.setGemsAndCatalystsMaxAllowance();

    await expect(
      gemsCatalystsRegistryAsUser3.burnGem(user3, gemId, burnAmount)
    ).to.be.revertedWith('INSUFFICIENT_FUNDS');
  });

  it('addGemsAndCatalysts should fail for existing gemId', async function () {
    const {
      gemsCatalystsRegistryAsRegAdmin,
      powerGem,
      commonCatalyst,
    } = await setupGemsAndCatalysts();
    await expect(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts(
        [powerGem.address],
        [commonCatalyst.address]
      )
    ).to.be.revertedWith('GEM_ID_NOT_IN_ORDER');
  });

  it('addGemsAndCatalysts should fail for existing catalystd', async function () {
    const {
      gemsCatalystsRegistryAsRegAdmin,
      commonCatalyst,
    } = await setupGemsAndCatalysts();
    await expect(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts(
        [],
        [commonCatalyst.address]
      )
    ).to.be.revertedWith('CATALYST_ID_NOT_IN_ORDER');
  });

  it('addGemsAndCatalysts should fail for catalyst with address zero', async function () {
    const {gemsCatalystsRegistryAsRegAdmin} = await setupGemsAndCatalysts();
    await expect(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts([], [zeroAddress])
    ).to.be.revertedWith('CATALYST_ZERO_ADDRESS');
  });

  it('addGemsAndCatalysts should fail for gem with address zero', async function () {
    const {gemsCatalystsRegistryAsRegAdmin} = await setupGemsAndCatalysts();
    await expect(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts([zeroAddress], [])
    ).to.be.revertedWith('GEM_ZERO_ADDRESS');
  });

  it('addGemsAndCatalysts should add gemExample', async function () {
    const {
      gemsCatalystsRegistry,
      gemExample,
      gemsCatalystsRegistryAsRegAdmin,
    } = await setupGemsAndCatalysts();
    const receipt = await waitFor(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts(
        [gemExample.address],
        []
      )
    );
    const gemId = await gemExample.gemId();
    expect(await gemsCatalystsRegistry.doesGemExist(gemId)).to.equal(true);
    const event = await expectEventWithArgs(
      gemsCatalystsRegistry,
      receipt,
      'AddGemsAndCatalysts'
    );
    expect(event.args[0][0]).to.be.equal(gemExample.address);
  });

  it('addGemsAndCatalysts should add catalystExample', async function () {
    const {
      gemsCatalystsRegistry,
      catalystExample,
      gemsCatalystsRegistryAsRegAdmin,
    } = await setupGemsAndCatalysts();
    const receipt = await waitFor(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts(
        [],
        [catalystExample.address]
      )
    );
    const catalystId = await catalystExample.catalystId();
    expect(await gemsCatalystsRegistry.doesCatalystExist(catalystId)).to.equal(
      true
    );
    const event = await expectEventWithArgs(
      gemsCatalystsRegistry,
      receipt,
      'AddGemsAndCatalysts'
    );
    expect(event.args[1][0]).to.be.equal(catalystExample.address);
  });

  it('addGemsAndCatalysts should fail for gem id not in order', async function () {
    const {
      gemNotInOrder,
      gemsCatalystsRegistryAsRegAdmin,
    } = await setupGemsAndCatalysts();
    await expect(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts(
        [gemNotInOrder.address],
        []
      )
    ).to.be.revertedWith('GEM_ID_NOT_IN_ORDER');
  });

  it('addGemsAndCatalysts should fail for unauthorized user', async function () {
    const {
      gemsCatalystsRegistryAsUser3,
      gemExample,
    } = await setupGemsAndCatalysts();
    await expect(
      gemsCatalystsRegistryAsUser3.addGemsAndCatalysts([gemExample.address], [])
    ).to.be.reverted;
  });

  it('addGemsAndCatalysts should fail if too many G&C', async function () {
    const {
      gemsCatalystsRegistry,
      gemsCatalystsRegistryAsRegAdmin,
      gemOwner,
      trustedForwarder,
      upgradeAdmin,
    } = await setupGemsAndCatalysts();

    const addresses = [];
    const result = await deployments.deploy(`Gem_MaxLimit`, {
      contract: 'GemV1',
      from: gemOwner,
      log: true,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: '__GemV1_init',
          args: [
            `Gem_MaxLimit`,
            `Gem_MaxLimit`,
            trustedForwarder.address,
            gemOwner,
            255,
            gemsCatalystsRegistry.address,
          ],
        },
        upgradeIndex: 0,
      },
    });
    // In order to speed up test we deploy only one gem contract and try to add max of it
    for (let i = 6; i < 253; i++) {
      addresses.push(result.address);
    }
    await expect(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts(addresses, [])
    ).to.be.revertedWith(
      'GemsCatalystsRegistry: Too many gem and catalyst contracts'
    );
  });

  it('addGemsAndCatalysts pass if max -1 G&C', async function () {
    const {
      gemsCatalystsRegistry,
      gemsCatalystsRegistryAsRegAdmin,
      gemOwner,
      upgradeAdmin,
      trustedForwarder,
    } = await setupGemsAndCatalysts();

    const addresses = [];
    const result = await deployments.deploy(`Gem_MaxLimit`, {
      contract: 'GemV1',
      from: gemOwner,
      log: true,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: '__GemV1_init',
          args: [
            `Gem_MaxLimit`,
            `Gem_MaxLimit`,
            trustedForwarder.address,
            gemOwner,
            255,
            gemsCatalystsRegistry.address,
          ],
        },
        upgradeIndex: 0,
      },
    });
    // In order to speed up test we deploy only one gem contract and try to add max -1 of it
    for (let i = 6; i < 252; i++) {
      addresses.push(result.address);
    }
    // We should expect to pass the max G&C require but as we only deploy one gem contract it should fail on the ID order require
    await expect(
      gemsCatalystsRegistryAsRegAdmin.addGemsAndCatalysts(addresses, [])
    ).to.be.revertedWith('GEM_ID_NOT_IN_ORDER');
  });
  it('batchBurnGems reverts on gemsIds and amounts length mismatch', async function () {
    const {
      gemsCatalystsRegistryAsGemOwner,
      powerGem,
      defenseGem,
      gemOwner,
    } = await setupGemsAndCatalysts();
    const powerGemId = await powerGem.gemId();
    const defenseGemId = await defenseGem.gemId();
    const burnAmount = BigNumber.from('15555');

    //approving
    await gemsCatalystsRegistryAsGemOwner.setGemsAndCatalystsMaxAllowance();

    await expect(
      gemsCatalystsRegistryAsGemOwner.batchBurnGems(
        gemOwner,
        [defenseGemId, powerGemId],
        [burnAmount]
      )
    ).to.revertedWith(
      'GemsCatalystsRegistry: gemsIds and amounts length mismatch'
    );
  });
  it('batchBurnGems for two different gem tokens', async function () {
    const {
      gemsCatalystsRegistryAsGemOwner,
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
    const burnAmount = BigNumber.from('15555');

    //approving
    await gemsCatalystsRegistryAsGemOwner.setGemsAndCatalystsMaxAllowance();

    await waitFor(
      gemsCatalystsRegistryAsGemOwner.batchBurnGems(
        gemOwner,
        [defenseGemId, powerGemId],
        [burnAmount, burnAmount]
      )
    );
    const balanceAfterBurningPowerGem = await powerGem.balanceOf(gemOwner);
    const balanceAfterBurningDefenseGem = await defenseGem.balanceOf(gemOwner);
    const totalSupplyAfterBurningPowerGem = await powerGem.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await defenseGem.totalSupply();
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
  it('batchBurnCatalysts reverts on catalystIds and amounts length mismatch', async function () {
    const {
      gemsCatalystsRegistryAsCatalystOwner,
      rareCatalyst,
      commonCatalyst,
      catalystOwner,
    } = await setupGemsAndCatalysts();
    const rareCatalystId = await rareCatalyst.catalystId();
    const commonCatalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from('100');

    //approving
    await gemsCatalystsRegistryAsCatalystOwner.setGemsAndCatalystsMaxAllowance();

    await expect(
      gemsCatalystsRegistryAsCatalystOwner.batchBurnCatalysts(
        catalystOwner,
        [rareCatalystId, commonCatalystId],
        [burnAmount]
      )
    ).to.revertedWith(
      'GemsCatalystsRegistry: catalystIds and amounts length mismatch'
    );
  });
  it('batchBurnCatalysts for two different catalyst tokens', async function () {
    const {
      gemsCatalystsRegistryAsCatalystOwner,
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
    const burnAmount = BigNumber.from('100');

    //approving
    await gemsCatalystsRegistryAsCatalystOwner.setGemsAndCatalystsMaxAllowance();

    await waitFor(
      gemsCatalystsRegistryAsCatalystOwner.batchBurnCatalysts(
        catalystOwner,
        [rareCatalystId, commonCatalystId],
        [burnAmount, burnAmount]
      )
    );
    const balanceAfterBurningRareCatalyst = await rareCatalyst.balanceOf(
      catalystOwner
    );
    const balanceAfterBurningCommonCatalyst = await commonCatalyst.balanceOf(
      catalystOwner
    );
    const totalSupplyAfterBurningRareCatalyst = await rareCatalyst.totalSupply();
    const totalSupplyAfterBurningDefenseGem = await commonCatalyst.totalSupply();
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
      gemsCatalystsRegistryAsGemOwner,
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

    //approving
    gemsCatalystsRegistryAsGemOwner.setGemsAndCatalystsMaxAllowance();

    await waitFor(
      gemsCatalystsRegistryAsGemOwner.batchBurnGems(
        gemOwner,
        [defenseGemId, powerGemId],
        burnAmounts
      )
    );
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

  it('only DEFAULT_ADMIN_ROLE can set trusted forwarder', async function () {
    const {
      gemsCatalystsRegistryAsRegAdmin,
      trustedForwarder,
      powerGem,
      gemsCatalystsRegistryAsDeployer,
    } = await setupGemsAndCatalysts();
    const initialTrustedForwarder = await gemsCatalystsRegistryAsRegAdmin.getTrustedForwarder();
    expect(initialTrustedForwarder).to.equal(trustedForwarder.address);

    await waitFor(
      gemsCatalystsRegistryAsRegAdmin.setTrustedForwarder(powerGem.address)
    );

    const newTrustedForwarder = await gemsCatalystsRegistryAsRegAdmin.getTrustedForwarder();
    expect(newTrustedForwarder).to.equal(powerGem.address);

    await expect(
      gemsCatalystsRegistryAsDeployer.setTrustedForwarder(
        trustedForwarder.address
      )
    ).to.be.revertedWith(
      'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });
  it('cannot set trustedForwarder to zero address', async function () {
    const {
      gemsCatalystsRegistryAsRegAdmin,
      trustedForwarder,
    } = await setupGemsAndCatalysts();
    const initialTrustedForwarder = await gemsCatalystsRegistryAsRegAdmin.getTrustedForwarder();
    expect(initialTrustedForwarder).to.equal(trustedForwarder.address);

    await expect(
      gemsCatalystsRegistryAsRegAdmin.setTrustedForwarder(zeroAddress)
    ).to.be.revertedWith('ZERO_ADDRESS');
  });
});
