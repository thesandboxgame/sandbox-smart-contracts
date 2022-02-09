import {expect} from '../../../chai-setup';
import {landOwnerContributionCalculatorSetup} from '../fixtures/contributionCalculator.fixture';
import {deployments, ethers} from 'hardhat';

describe('LandOwnerContributionCalculator', function () {
  describe('roles', function () {
    it('admin should be able to call setNFTMultiplierToken', async function () {
      const {
        deployer,
        contractAsAdmin,
      } = await landOwnerContributionCalculatorSetup();
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
      } = await landOwnerContributionCalculatorSetup();
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
    it('users without lands get zero contributions', async function () {
      const {
        contract,
        landToken,
        other,
      } = await landOwnerContributionCalculatorSetup();
      expect(await landToken.balanceOf(other)).to.be.equal(0);
      expect(await contract.multiplierOf(other)).to.be.equal(0);
      expect(await contract.computeContribution(other, 1000)).to.be.equal(0);
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    [1, 2, 3, 4].forEach((numLands) => {
      it(numLands + ' lands', async function () {
        const {
          contract,
          landToken,
          other,
        } = await landOwnerContributionCalculatorSetup();
        const stake = 1000 * numLands;
        for (let i = 0; i < numLands; i++) {
          await landToken.mint(other, 123 + i);
        }
        expect(await landToken.balanceOf(other)).to.be.equal(numLands);
        expect(await contract.multiplierOf(other)).to.be.equal(numLands);
        expect(await contract.computeContribution(other, stake)).to.be.equal(
          stake
        );
      });
    });
  });
});
