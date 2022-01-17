import {expect} from '../../../chai-setup';
import {landContributionCalculatorSetup} from '../fixtures/contributionCalculator.fixture';
import {deployments, ethers} from 'hardhat';
import {contribution} from '../../../common/contributionEquation';
import {BigNumber} from 'ethers';

describe('LandContributionCalculator', function () {
  describe('roles', function () {
    it('admin should be able to call setNFTMultiplierToken', async function () {
      const {
        deployer,
        contractAsAdmin,
      } = await landContributionCalculatorSetup();
      await deployments.deploy('someOtherContract', {
        from: deployer,
        contract: 'ERC721Mintable',
        args: ['LandToken', 'LTK'],
      });
      const someOtherContract = await ethers.getContract('someOtherContract');
      await expect(
        contractAsAdmin.setNFTMultiplierToken(someOtherContract.address)
      ).not.to.be.reverted;
    });
    it('others should fail to call setNFTMultiplierToken', async function () {
      const {
        deployer,
        contract,
        contractAsOther,
      } = await landContributionCalculatorSetup();
      await deployments.deploy('someOtherContract', {
        from: deployer,
        contract: 'ERC721Mintable',
        args: ['LandToken', 'LTK'],
      });
      const someOtherContract = await ethers.getContract('someOtherContract');
      await expect(
        contract.setNFTMultiplierToken(someOtherContract.address)
      ).to.be.revertedWith('not the owner');
      await expect(
        contractAsOther.setNFTMultiplierToken(someOtherContract.address)
      ).to.be.revertedWith('not the owner');
    });
  });

  describe('calculation', function () {
    it('zero lands', async function () {
      const {
        contract,
        landToken,
        other,
      } = await landContributionCalculatorSetup();
      expect(await landToken.balanceOf(other)).to.be.equal(0);
      expect(await contract.multiplierOf(other)).to.be.equal(0);
      expect(await contract.computeContribution(other, 1000)).to.be.equal(1000);
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    [1, 2, 3, 4].forEach((numLands) => {
      it(numLands + ' lands', async function () {
        const {
          contract,
          landToken,
          other,
        } = await landContributionCalculatorSetup();
        for (let i = 0; i < numLands; i++) {
          await landToken.mint(other, 123 + i);
        }
        expect(await landToken.balanceOf(other)).to.be.equal(numLands);
        expect(await contract.multiplierOf(other)).to.be.equal(numLands);
        expect(await contract.computeContribution(other, 1000)).to.be.equal(
          contribution(BigNumber.from(1000), BigNumber.from(numLands))
        );
      });
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    [5, 10, 20, 50, 100, 408, 408 * 408, 408 * 408 * 408].forEach(
      (numLands) => {
        it(numLands + ' lands, to high to be minted', async function () {
          const {
            contract,
            landToken,
            other,
          } = await landContributionCalculatorSetup();
          const numLands = 408 * 408;
          await landToken.setFakeBalance(other, numLands);
          expect(await landToken.balanceOf(other)).to.be.equal(numLands);
          expect(await contract.multiplierOf(other)).to.be.equal(numLands);
          expect(await contract.computeContribution(other, 1000)).to.be.equal(
            contribution(BigNumber.from(1000), BigNumber.from(numLands))
          );
        });
      }
    );
  });
});
