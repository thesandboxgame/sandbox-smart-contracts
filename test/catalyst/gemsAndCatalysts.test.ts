import { ethers } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from '../chai-setup';
import { setupGemsAndCatalysts } from './fixtures';
describe('GemsAndCatalysts', function () {
  it('getMaxGems for catalystId = 1 should be 1', async function () {
    const { gemsAndCatalysts, commonCatalyst } = await setupGemsAndCatalysts();
    const catalystId = await commonCatalyst.catalystId();
    const maxGems = await gemsAndCatalysts.getMaxGems(catalystId);
    expect(maxGems).to.equal(1);
  });

  it('getMaxGems for non existing catalystId should fail', async function () {
    const { gemsAndCatalysts } = await setupGemsAndCatalysts();
    expect(gemsAndCatalysts.getMaxGems(10)).to.be.revertedWith("CATALYST_DOES_NOT_EXIST");
  });

  it('burnCatalyst should burn 2 common catalysts from deployer account', async function () {
    const { gemsAndCatalysts, commonCatalyst, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const catalystId = await commonCatalyst.catalystId();
    const totalSupplyBefore = await commonCatalyst.totalSupply();
    const balanceBeforeBurning = await commonCatalyst.balanceOf(deployer);
    const burnAmount = BigNumber.from("2");
    await gemsAndCatalysts.connect(ethers.provider.getSigner(deployer)).burnCatalyst(deployer, catalystId, burnAmount);
    const totalSupplyAfter = await commonCatalyst.totalSupply();
    const balanceAfterBurning = await commonCatalyst.balanceOf(deployer);
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
    expect(totalSupplyAfter).to.equal(totalSupplyBefore.sub(burnAmount));
  });

  it('burnCatalyst should fail for non existing catalystId', async function () {
    const { gemsAndCatalysts, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const burnAmount = BigNumber.from("2");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      burnCatalyst(deployer, 101, burnAmount)).to.be.revertedWith("CATALYST_DOES_NOT_EXIST");
  });

  it('burnCatalyst should fail for insufficient amount', async function () {
    const { gemsAndCatalysts, commonCatalyst, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const catalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from("200");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      burnGem(deployer, catalystId, burnAmount)).to.be.revertedWith("Not enough funds");
  });

  it('burnCatalyst should fail for account with no gems', async function () {
    const { gemsAndCatalysts, commonCatalyst, accounts } = await setupGemsAndCatalysts();
    const { assetAdmin } = accounts;
    const catalystId = await commonCatalyst.catalystId();
    const burnAmount = BigNumber.from("200");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(assetAdmin)).
      burnGem(assetAdmin, catalystId, burnAmount)).to.be.revertedWith("Not enough funds");
  });

  it('burnGem should burn 3 power gems from deployer account', async function () {
    const { gemsAndCatalysts, powerGem, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const gemId = await powerGem.gemId();
    const totalSupplyBefore = await powerGem.totalSupply();
    const balanceBeforeBurning = await powerGem.balanceOf(deployer);
    const burnAmount = BigNumber.from("3");
    await gemsAndCatalysts.connect(ethers.provider.getSigner(deployer)).burnGem(deployer, gemId, burnAmount);
    const balanceAfterBurning = await powerGem.balanceOf(deployer);
    const totalSupplyAfter = await powerGem.totalSupply();
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
    expect(totalSupplyAfter).to.equal(totalSupplyBefore.sub(burnAmount));
  });

  it('burnGem should fail for non existing gemId', async function () {
    const { gemsAndCatalysts, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const burnAmount = BigNumber.from("2");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      burnGem(deployer, 101, burnAmount)).to.be.revertedWith("GEM_DOES_NOT_EXIST");
  });

  it('burnGem should fail for insufficient amount', async function () {
    const { gemsAndCatalysts, powerGem, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const gemId = await powerGem.gemId();
    const burnAmount = BigNumber.from("200");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      burnGem(deployer, gemId, burnAmount)).to.be.revertedWith("Not enough funds");
  });

  it('burnGem should fail for account with no gems', async function () {
    const { gemsAndCatalysts, powerGem, accounts } = await setupGemsAndCatalysts();
    const { assetAdmin } = accounts;
    const gemId = await powerGem.gemId();
    const burnAmount = BigNumber.from("200");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(assetAdmin)).
      burnGem(assetAdmin, gemId, burnAmount)).to.be.revertedWith("Not enough funds");
  });
  it('addGemsAndCatalysts should fail for existing gemId', async function () {
    const { gemsAndCatalysts, powerGem, commonCatalyst, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      addGemsAndCatalysts([powerGem.address], [commonCatalyst.address])).to.be.revertedWith("GEM_ID_NOT_IN_ORDER");
  });

  it('addGemsAndCatalysts should fail for existing catalystd', async function () {
    const { gemsAndCatalysts, commonCatalyst, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      addGemsAndCatalysts([], [commonCatalyst.address])).to.be.revertedWith("CATALYST_ID_NOT_IN_ORDER");
  });

  it('addGemsAndCatalysts should add gemExample', async function () {
    const { gemsAndCatalysts, gemExample, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const tx = await gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      addGemsAndCatalysts([gemExample.address], [])
    await tx.wait();
    const gemId = await gemExample.gemId();
    expect(await gemsAndCatalysts.isGemExists(gemId)).to.equal(true);
  });

  it('addGemsAndCatalysts should add catalystExample', async function () {
    const { gemsAndCatalysts, catalystExample, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const tx = await gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      addGemsAndCatalysts([], [catalystExample.address])
    await tx.wait();
    const catalystId = await catalystExample.catalystId();
    expect(await gemsAndCatalysts.isCatalystExists(catalystId)).to.equal(true);
  });

  it('addGemsAndCatalysts should fail for gem id not in order', async function () {
    const { gemsAndCatalysts, gemNotInOrder, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      addGemsAndCatalysts([gemNotInOrder.address], [])).to.be.revertedWith("GEM_ID_NOT_IN_ORDER");
  });

  it('addGemsAndCatalysts should fail for unauthorized user', async function () {
    const { gemsAndCatalysts, gemExample, accounts } = await setupGemsAndCatalysts();
    const { estateAdmin } = accounts;
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(estateAdmin)).
      addGemsAndCatalysts([gemExample.address], [])).to.be.revertedWith("GEM_ID_NOT_IN_ORDER");
  });

  // it('burnDifferentGems', async function () {
  //   const { gemsAndCatalysts, gemExample, accounts } = await setupGemsAndCatalysts();
  //   const { estateAdmin } = accounts;
  //   expect(gemsAndCatalysts.
  //     connect(ethers.provider.getSigner(estateAdmin)).
  //     addGemsAndCatalysts([gemExample.address], [])).to.be.revertedWith("GEM_ID_NOT_IN_ORDER");
  // });
});
