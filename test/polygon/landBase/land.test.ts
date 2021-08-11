import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../../chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import {setupUsers, waitFor} from '../../utils';

type User = {
  address: string;
  MockLandWithMint: Contract;
};

const setupTest = deployments.createFixture(
  async (): Promise<{
    MockLandWithMint: Contract;
    landOwners: User[];
  }> => {
    await deployments.fixture('MockLandWithMint');
    const MockLandWithMint = await ethers.getContract('MockLandWithMint');
    const unnamedAccounts = await getUnnamedAccounts();
    const landOwners = await setupUsers(unnamedAccounts, {MockLandWithMint});
    return {MockLandWithMint, landOwners};
  }
);

describe('MockLandWithMint.sol', function () {
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
      const quadId =
        '1356938545749799165119972480570561420155507632800475359837393562592731987968';

      const addressMint = await landOwners[0].MockLandWithMint.ownerOf(quadId);
      expect(addressMint).to.equal(landOwners[0].address);

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

  describe('transfer batch', function () {
    it('testing batchTransferQuad', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          300,
          300,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          30,
          30,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          24,
          24,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
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
      expect(num2).to.equal(765);
    });
  });
});
