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

  it('burnCatalyst', async function () {
    const { gemsAndCatalysts, commonCatalyst, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const catalystId = await commonCatalyst.catalystId();
    const balanceBeforeBurning = await commonCatalyst.balanceOf(deployer);
    const burnAmount = BigNumber.from("2");
    await gemsAndCatalysts.connect(ethers.provider.getSigner(deployer)).burnCatalyst(deployer, catalystId, burnAmount);
    const balanceAfterBurning = await commonCatalyst.balanceOf(deployer);
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
  });

  it('burnCatalyst should fail for non existing catalystId', async function () {
    const { gemsAndCatalysts, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const burnAmount = BigNumber.from("2");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      burnCatalyst(deployer, 101, burnAmount)).to.be.revertedWith("CATALYST_DOES_NOT_EXIST");
  });

  it('burnGem', async function () {
    const { gemsAndCatalysts, powerGem, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const gemId = await powerGem.gemId();
    const balanceBeforeBurning = await powerGem.balanceOf(deployer);
    const burnAmount = BigNumber.from("3");
    await gemsAndCatalysts.connect(ethers.provider.getSigner(deployer)).burnGem(deployer, gemId, burnAmount);
    const balanceAfterBurning = await powerGem.balanceOf(deployer);
    expect(balanceAfterBurning).to.equal(balanceBeforeBurning.sub(burnAmount));
  });

  it('burnGem should fail for non existing gemId', async function () {
    const { gemsAndCatalysts, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    const burnAmount = BigNumber.from("2");
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      burnGem(deployer, 101, burnAmount)).to.be.revertedWith("GEM_DOES_NOT_EXIST");
  });

  it('addGemsAndCatalysts should fail for existing gemId', async function () {
    const { gemsAndCatalysts, powerGem, commonCatalyst, accounts } = await setupGemsAndCatalysts();
    const { deployer } = accounts;
    expect(gemsAndCatalysts.
      connect(ethers.provider.getSigner(deployer)).
      addGemsAndCatalysts([powerGem.address], [commonCatalyst.address])).to.be.revertedWith("GEM_DOES_NOT_EXIST");
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
});
