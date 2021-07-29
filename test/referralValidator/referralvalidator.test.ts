import {expect} from '../chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import {setupUsers, waitFor} from '../utils';

type User = {
  address: string;
  ReferralValidator08: Contract;
};

const setupTest = deployments.createFixture(
  async (): Promise<{
    ReferralValidator08: Contract;
    validators: User[];
  }> => {
    await deployments.fixture('ReferralValidator08');
    const ReferralValidator08 = await ethers.getContract('ReferralValidator08');
    const unnamedAccounts = await getUnnamedAccounts();
    const validators = await setupUsers(unnamedAccounts, {ReferralValidator08});
    return {ReferralValidator08, validators};
  }
);

describe('ReferralValidator08.sol', function () {
  describe('Mint and transfer', function () {
    it('testing transferQuad', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          0,
          0,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);
      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          12,
          0,
          0,
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(144);
    });
  });
});
