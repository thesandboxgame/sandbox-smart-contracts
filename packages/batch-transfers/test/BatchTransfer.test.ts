import {expect} from 'chai';
import {ethers} from 'hardhat';
import {MockERC721} from '../typechain-types/contracts/mocks/MockERC721';

describe('BatchTransfer (/packages/batch-transfer/contracts/BatchTransfer.sol)', async function () {
  it('deploys correctly', async function () {
    const BatchTransfer = await ethers.getContractFactory('BatchTransfer');
    const batchTransfer = await BatchTransfer.deploy();
    expect(await batchTransfer.getAddress()).to.be.properAddress;
  });
  describe('Token transfers', async function () {
    let batchTransferContract: any;
    let batchTransferContractAddress: string;
    let erc721Contract: MockERC721;
    let erc721ContractAddress: string;
    let erc1155Contract: any;
    let erc1155ContractAddress: string;
    this.beforeEach(async function () {
      const [_, operator] = await ethers.getSigners();
      const BatchTransfer = await ethers.getContractFactory('BatchTransfer');
      batchTransferContract = await BatchTransfer.deploy();
      batchTransferContractAddress = await batchTransferContract.getAddress();

      // grant operator permission to transfer tokens
      await batchTransferContract.grantRole(
        await batchTransferContract.OPERATOR_ROLE(),
        operator.address,
      );

      // Mint some ERC721 tokens to operator
      const ERC721 = await ethers.getContractFactory('MockERC721');
      erc721Contract = await ERC721.deploy();
      erc721ContractAddress = await erc721Contract.getAddress();
      for (let i = 0; i < 10; i++) {
        await erc721Contract.safeMint(operator.address);
      }

      // aprove batchTransferContract to transfer ERC721 tokens
      await erc721Contract
        .connect(operator)
        .setApprovalForAll(batchTransferContractAddress, true);

      // Mint some ERC1155 tokens to operator
      const ERC1155 = await ethers.getContractFactory('MockERC1155');
      erc1155Contract = await ERC1155.deploy();
      erc1155ContractAddress = await erc1155Contract.getAddress();
      await erc1155Contract.mintBatch(
        operator.address,
        Array.from({length: 10}, (_, i) => i),
        Array(10).fill(10),
        '0x',
      );

      // aprove batchTransferContract to transfer ERC1155 tokens
      await erc1155Contract
        .connect(operator)
        .setApprovalForAll(batchTransferContractAddress, true);
    });
    it('correctly transfers ERC721 tokens', async function () {
      const [_, operator, erc721Receiver] = await ethers.getSigners();

      await batchTransferContract.connect(operator).batchTransfer(
        Array(10).fill(erc721ContractAddress),
        Array(10).fill(erc721Receiver.address),
        Array.from({length: 10}, (_, i) => [`${i}`]),
        Array(10).fill([1]),
        Array(10).fill(false),
      );

      // check if the erc721Receiver is the owner of tokens 0-9
      expect(await erc721Contract.ownerOf(0)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(1)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(2)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(3)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(4)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(5)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(6)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(7)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(8)).to.equal(erc721Receiver.address);
      expect(await erc721Contract.ownerOf(9)).to.equal(erc721Receiver.address);
    });
    it('correctly transfers ERC11555 tokens', async function () {
      const [_, operator, firstErc1155Receiver, secondErc1155Receiver] =
        await ethers.getSigners();

      await batchTransferContract.connect(operator).batchTransfer(
        Array(10).fill(erc1155ContractAddress),
        Array.from({length: 10}, (_, i) =>
          i % 2 === 0
            ? firstErc1155Receiver.address
            : secondErc1155Receiver.address,
        ),
        Array.from({length: 10}, (_, i) => [`${i}`]),
        Array.from({length: 10}, (_, i) => (i % 2 === 0 ? [1] : [2])),
        Array(10).fill(true),
      );

      // check if the firstErc1155Receiver is the owner of tokens 0, 2, 4, 6, 8
      expect(
        await erc1155Contract.balanceOf(firstErc1155Receiver.address, 0),
      ).to.equal(1);
      expect(
        await erc1155Contract.balanceOf(firstErc1155Receiver.address, 2),
      ).to.equal(1);
      expect(
        await erc1155Contract.balanceOf(firstErc1155Receiver.address, 4),
      ).to.equal(1);
      expect(
        await erc1155Contract.balanceOf(firstErc1155Receiver.address, 6),
      ).to.equal(1);
      expect(
        await erc1155Contract.balanceOf(firstErc1155Receiver.address, 8),
      ).to.equal(1);

      // check if the secondErc1155Receiver is the owner of tokens 1, 3, 5, 7, 9
      expect(
        await erc1155Contract.balanceOf(secondErc1155Receiver.address, 1),
      ).to.equal(2);
      expect(
        await erc1155Contract.balanceOf(secondErc1155Receiver.address, 3),
      ).to.equal(2);
      expect(
        await erc1155Contract.balanceOf(secondErc1155Receiver.address, 5),
      ).to.equal(2);
      expect(
        await erc1155Contract.balanceOf(secondErc1155Receiver.address, 7),
      ).to.equal(2);
      expect(
        await erc1155Contract.balanceOf(secondErc1155Receiver.address, 9),
      ).to.equal(2);
    });
    it('correctly transfers a mix of ERC721 and ERC1155 tokens', async function () {
      const [_, operator, firstReceiver, secondReceiver] =
        await ethers.getSigners();
      //  both receivers should get some erc721 and erc1155 tokens
      await batchTransferContract
        .connect(operator)
        .batchTransfer(
          [
            erc721ContractAddress,
            erc1155ContractAddress,
            erc721ContractAddress,
            erc1155ContractAddress,
          ],
          [
            firstReceiver.address,
            firstReceiver.address,
            secondReceiver.address,
            secondReceiver.address,
          ],
          [[0], [0], [1], [1]],
          [[1], [3], [1], [5]],
          [false, true, false, true],
        );

      // check if the firstReceiver owns ERC721 token id 0 and three copies of ERC1155 token id 0
      expect(await erc721Contract.ownerOf(0)).to.equal(firstReceiver.address);
      expect(
        await erc1155Contract.balanceOf(firstReceiver.address, 0),
      ).to.equal(3);

      // check if the secondReceiver owns ERC721 token id 1 and five copies of ERC1155 token id 1
      expect(await erc721Contract.ownerOf(1)).to.equal(secondReceiver.address);
      expect(
        await erc1155Contract.balanceOf(secondReceiver.address, 1),
      ).to.equal(5);
    });
  });
});
