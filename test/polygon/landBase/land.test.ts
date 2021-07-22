import {expect} from '../../chai-setup';
import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';
import {setupUsers, waitFor} from '../../utils';

type User = {
  address: string;
  MockLandWithMint: Contract;
};

/*const setupTest = deployments.createFixture(async function () {
  await deployments.fixture(['MockLandWithMint']);

  const accounts = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  const user0 = others[0];
  const user1 = others[1];


  const MockLandWithMint = await ethers.getContract('MockLandWithMint');
  await deployments.deploy('MockERC20BasicApprovalTarget', {
    from: accounts.deployer,
    args: [],
  });

  return {MockLandWithMint, accounts, others, user0, user1};
});*/

const setupTest = deployments.createFixture(
  async (): Promise<{
    MockLandWithMint: Contract;
    landOwners: User[];
    //user0: User;
    //user1: User;
  }> => {
    await deployments.fixture('MockLandWithMint');
    const MockLandWithMint = await ethers.getContract('MockLandWithMint');
    const unnamedAccounts = await getUnnamedAccounts();
    const landOwners = await setupUsers(unnamedAccounts, {MockLandWithMint});
    //const user0 = landOwners[0];
    //const user1 = landOwners[1];

    return {MockLandWithMint, landOwners /*, user0, user1*/};
  }
);

describe('MockLandWithMint.sol', function () {
  describe('Mint and transfer', function () {
    it('testing transferQuad', async function () {
      const {
        MockLandWithMint,
        landOwners /*, user0, user1*/,
      } = await setupTest();
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
      const num1 = await MockLandWithMint.balanceOf(landOwners[0].address);
      expect(num1).to.equal(0);
      const num2 = await MockLandWithMint.balanceOf(landOwners[1].address);
      expect(num2).to.equal(144);
    });
  });

  describe('transfer batch', function () {
    it('testing batchTransferQuad', async function () {
      const {MockLandWithMint, landOwners} = await setupTest();
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
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
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

//address to, uint256 x, uint256 y, uint256 size, uint256 price

/*
batchTransferQuad(
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) external {
*/
