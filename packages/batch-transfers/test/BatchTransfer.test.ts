import {expect} from 'chai';
import {ethers} from 'hardhat';
import {MockERC721} from '../typechain-types/contracts/mocks/MockERC721';

const runSetup = async () => {
  const [_, operator] = await ethers.getSigners();

  const BatchTransfer = await ethers.getContractFactory('BatchTransfer');
  const batchTransferContract = await BatchTransfer.deploy();
  const batchTransferContractAddress = await batchTransferContract.getAddress();

  // grant operator permission to transfer tokens
  await batchTransferContract.grantRole(
    await batchTransferContract.OPERATOR_ROLE(),
    operator.address,
  );

  const approveBatchTransfer = async (
    contract: any,
    batchTransferContract: any,
  ) => {
    await contract
      .connect(operator)
      .setApprovalForAll(batchTransferContract.getAddress(), true);
  };

  const deployERC721 = async () => {
    const ERC721 = await ethers.getContractFactory('MockERC721');
    return await ERC721.deploy();
  };

  const mintERC721Tokens = async (erc721: MockERC721, count: number) => {
    for (let i = 0; i < count; i++) {
      await erc721.safeMint(operator);
    }
  };

  const deployERC1155 = async () => {
    const ERC1155 = await ethers.getContractFactory('MockERC1155');
    return await ERC1155.deploy();
  };

  const mintERC1155Token = async (erc1155: any, id: number, amount: number) => {
    await erc1155.mint(operator.address, id, amount, '0x');
  };

  return {
    operator,
    batchTransferContract,
    batchTransferContractAddress,
    approveBatchTransfer,
    deployERC721,
    mintERC721Tokens,
    deployERC1155,
    mintERC1155Token,
  };
};

describe('BatchTransfer (/packages/batch-transfer/contracts/BatchTransfer.sol)', async function () {
  it('deploys correctly', async function () {
    const [deployer] = await ethers.getSigners();
    const BatchTransfer = await ethers.getContractFactory('BatchTransfer');
    const batchTransfer = await BatchTransfer.deploy(deployer.address);
    expect(await batchTransfer.getAddress()).to.be.properAddress;
  });
  describe('Token transfers', async function () {
    it('Transfer 3 different ERC721 to 2 different receivers', async function () {
      const {
        deployERC721,
        mintERC721Tokens,
        approveBatchTransfer,
        batchTransferContract,
        operator,
      } = await runSetup();

      const tokenReceivers = await ethers.getSigners();
      const firstReceiver = tokenReceivers[2];
      const secondReceiver = tokenReceivers[3];

      const firstERC721Contract = await deployERC721();
      const secondERC721Contract = await deployERC721();
      const thirdERC721Contract = await deployERC721();

      await mintERC721Tokens(firstERC721Contract, 1);
      await mintERC721Tokens(secondERC721Contract, 1);
      await mintERC721Tokens(thirdERC721Contract, 1);

      await approveBatchTransfer(firstERC721Contract, batchTransferContract);
      await approveBatchTransfer(secondERC721Contract, batchTransferContract);
      await approveBatchTransfer(thirdERC721Contract, batchTransferContract);

      await batchTransferContract
        .connect(operator)
        .batchTransfer(
          [
            await firstERC721Contract.getAddress(),
            await secondERC721Contract.getAddress(),
            await thirdERC721Contract.getAddress(),
          ],
          [
            [firstReceiver.address],
            [firstReceiver.address],
            [secondReceiver.address],
          ],
          [[0], [0], [0]],
          [[1], [1], [1]],
          Array(3).fill(false),
        );

      expect(await firstERC721Contract.ownerOf(0)).to.equal(
        firstReceiver.address,
      );
      expect(await secondERC721Contract.ownerOf(0)).to.equal(
        firstReceiver.address,
      );
      expect(await thirdERC721Contract.ownerOf(0)).to.equal(
        secondReceiver.address,
      );
    });
    it('Transfer single token from 2 different ERC1155 contracts to 3 different receivers', async function () {
      const {
        deployERC1155,
        mintERC1155Token,
        approveBatchTransfer,
        batchTransferContract,
        operator,
      } = await runSetup();

      const tokenReceivers = await ethers.getSigners();
      const firstReceiver = tokenReceivers[2];
      const secondReceiver = tokenReceivers[3];
      const thirdReceiver = tokenReceivers[4];

      const firstERC1155Contract = await deployERC1155();
      const secondERC1155Contract = await deployERC1155();

      await mintERC1155Token(firstERC1155Contract, 0, 20);
      await mintERC1155Token(secondERC1155Contract, 0, 20);

      await approveBatchTransfer(firstERC1155Contract, batchTransferContract);
      await approveBatchTransfer(secondERC1155Contract, batchTransferContract);

      await batchTransferContract.connect(operator).batchTransfer(
        [
          await firstERC1155Contract.getAddress(),
          await secondERC1155Contract.getAddress(),
        ],
        [
          [firstReceiver.address, secondReceiver.address],
          [
            firstReceiver.address,
            secondReceiver.address,
            thirdReceiver.address,
          ],
        ],
        [
          [0, 0],
          [0, 0, 0],
        ],
        [
          [1, 2],
          [3, 4, 5],
        ],
        Array(2).fill(true),
      );

      // expect the first receiver to have 1 of the first token and 3 of the second token
      // expect the second receiver to have 2 of the first token and 4 of the second token
      // expect the third receiver to have 5 of the second token

      expect(
        await firstERC1155Contract.balanceOf(firstReceiver.address, 0),
      ).to.equal(1);
      expect(
        await secondERC1155Contract.balanceOf(firstReceiver.address, 0),
      ).to.equal(3);

      expect(
        await firstERC1155Contract.balanceOf(secondReceiver.address, 0),
      ).to.equal(2);
      expect(
        await secondERC1155Contract.balanceOf(secondReceiver.address, 0),
      ).to.equal(4);

      expect(
        await secondERC1155Contract.balanceOf(thirdReceiver.address, 0),
      ).to.equal(5);
    });
    it('Transfer multiple different tokens from 2 ERC1155 contracts to 3 different receivers', async function () {
      const {
        deployERC1155,
        mintERC1155Token,
        approveBatchTransfer,
        batchTransferContract,
        operator,
      } = await runSetup();

      const tokenReceivers = await ethers.getSigners();
      const firstReceiver = tokenReceivers[2];
      const secondReceiver = tokenReceivers[3];
      const thirdReceiver = tokenReceivers[4];

      const firstERC1155Contract = await deployERC1155();
      const secondERC1155Contract = await deployERC1155();

      await mintERC1155Token(firstERC1155Contract, 0, 20);
      await mintERC1155Token(firstERC1155Contract, 1, 20);
      await mintERC1155Token(firstERC1155Contract, 2, 20);

      await mintERC1155Token(secondERC1155Contract, 0, 20);
      await mintERC1155Token(secondERC1155Contract, 1, 20);
      await mintERC1155Token(secondERC1155Contract, 2, 20);

      await approveBatchTransfer(firstERC1155Contract, batchTransferContract);
      await approveBatchTransfer(secondERC1155Contract, batchTransferContract);

      await batchTransferContract.connect(operator).batchTransfer(
        [
          await firstERC1155Contract.getAddress(),
          await secondERC1155Contract.getAddress(),
        ],
        [
          [
            firstReceiver.address,
            secondReceiver.address,
            firstReceiver.address,
          ],
          [
            firstReceiver.address,
            secondReceiver.address,
            thirdReceiver.address,
          ],
        ],
        [
          [0, 1, 2],
          [0, 1, 2],
        ],
        [
          [1, 2, 3],
          [4, 5, 6],
        ],
        Array(2).fill(true),
      );

      // expect the first receiver to have 1 copy of token id 0, 3 copies of token id 2 from the first contract and 4 copies of token id 3 from the second contract
      expect(
        await firstERC1155Contract.balanceOf(firstReceiver.address, 0),
      ).to.equal(1);
      expect(
        await firstERC1155Contract.balanceOf(firstReceiver.address, 2),
      ).to.equal(3);
      expect(
        await secondERC1155Contract.balanceOf(firstReceiver.address, 0),
      ).to.equal(4);

      // expect the second receiver to have 2 copies of token id 1 from the first contract and 5 copies of token id 1 from the second contract
      expect(
        await firstERC1155Contract.balanceOf(secondReceiver.address, 1),
      ).to.equal(2);
      expect(
        await secondERC1155Contract.balanceOf(secondReceiver.address, 1),
      ).to.equal(5);
      // expect the third receiver to have 6 copies of token id 2 from the second contract
      expect(
        await secondERC1155Contract.balanceOf(thirdReceiver.address, 2),
      ).to.equal(6);
    });
    it('Transfers a mix of ERC721 and ERC1155 tokens to 2 different receivers correctly', async function () {
      // 3 different ERC721 contracts and 2 different ERC1155 contracts to 2 receivers
      const {
        deployERC721,
        mintERC721Tokens,
        deployERC1155,
        mintERC1155Token,
        approveBatchTransfer,
        batchTransferContract,
        operator,
      } = await runSetup();

      const tokenReceivers = await ethers.getSigners();
      const firstReceiver = tokenReceivers[2];
      const secondReceiver = tokenReceivers[3];

      const firstERC721Contract = await deployERC721();
      const secondERC721Contract = await deployERC721();
      const thirdERC721Contract = await deployERC721();

      const firstERC1155Contract = await deployERC1155();
      const secondERC1155Contract = await deployERC1155();

      await mintERC721Tokens(firstERC721Contract, 3);
      await mintERC721Tokens(secondERC721Contract, 2);
      await mintERC721Tokens(thirdERC721Contract, 1);

      await mintERC1155Token(firstERC1155Contract, 0, 20);
      await mintERC1155Token(secondERC1155Contract, 0, 20);
      await mintERC1155Token(secondERC1155Contract, 1, 20);

      await approveBatchTransfer(firstERC721Contract, batchTransferContract);
      await approveBatchTransfer(secondERC721Contract, batchTransferContract);
      await approveBatchTransfer(thirdERC721Contract, batchTransferContract);
      await approveBatchTransfer(firstERC1155Contract, batchTransferContract);
      await approveBatchTransfer(secondERC1155Contract, batchTransferContract);

      await batchTransferContract
        .connect(operator)
        .batchTransfer(
          [
            await firstERC721Contract.getAddress(),
            await firstERC721Contract.getAddress(),
            await secondERC721Contract.getAddress(),
            await secondERC721Contract.getAddress(),
            await thirdERC721Contract.getAddress(),
            await firstERC1155Contract.getAddress(),
            await secondERC1155Contract.getAddress(),
          ],
          [
            [firstReceiver.address],
            [secondReceiver.address],
            [secondReceiver.address],
            [firstReceiver.address],
            [secondReceiver.address],
            [firstReceiver.address, secondReceiver.address],
            [
              firstReceiver.address,
              secondReceiver.address,
              firstReceiver.address,
              secondReceiver.address,
            ],
          ],
          [[0], [1], [0], [1], [0], [0, 0], [0, 0, 1, 1]],
          [[], [], [], [], [], [3, 5], [2, 3, 4, 5]],
          [false, false, false, false, false, true, true],
        );

      // The first receiver should have:
      // token id 0 from the first ERC721 contract
      // token id 1 from the second ERC721 contract
      // 3 copies of token id 0 from the first ERC1155 contract
      // 2 copies of token id 0 from the second ERC1155 contract
      // 4 copies of token id 1 from the second ERC1155 contract

      expect(await firstERC721Contract.ownerOf(0)).to.equal(
        firstReceiver.address,
      );
      expect(await secondERC721Contract.ownerOf(1)).to.equal(
        firstReceiver.address,
      );
      expect(
        await firstERC1155Contract.balanceOf(firstReceiver.address, 0),
      ).to.equal(3);
      expect(
        await secondERC1155Contract.balanceOf(firstReceiver.address, 0),
      ).to.equal(2);
      expect(
        await secondERC1155Contract.balanceOf(firstReceiver.address, 1),
      ).to.equal(4);
    });
  });
});
