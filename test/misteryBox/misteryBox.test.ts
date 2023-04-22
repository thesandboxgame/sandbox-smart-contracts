import {expect} from '../chai-setup';
import {ethers, deployments} from 'hardhat';
import {Contract} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {expectEventWithArgs} from '../utils';

describe('MisteryBox', function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let misteryBox: Contract;
  let mockAssetERC721: Contract;
  let mockAssetERC1155: Contract;

  beforeEach(async function () {
    const [deployer, account1, account2] = await ethers.getSigners();
    owner = deployer;
    addr1 = account1;
    addr2 = account2;

    const MockAssetERC721 = await ethers.getContractFactory('MockAssetERC721');
    mockAssetERC721 = await MockAssetERC721.deploy();
    await mockAssetERC721.deployed();

    const {deploy} = deployments;

    const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
      from: deployer.address,
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const MockAssetERC1155 = await ethers.getContractFactory(
      'MockAssetERC1155',
      {
        libraries: {
          ERC1155ERC721Helper: ERC1155ERC721HelperLib.address,
        },
      }
    );

    mockAssetERC1155 = await MockAssetERC1155.deploy();
    await mockAssetERC1155.deployed();

    const MisteryBox = await ethers.getContractFactory('MisteryBox');
    misteryBox = await MisteryBox.deploy();

    await misteryBox.deployed();
  });

  it('should safely transfer an ERC721 token', async function () {
    // Mint an ERC721 token and approve the MisteryBox contract
    await mockAssetERC721
      .connect(addr1)
      .mintWithOutMinterCheck(addr1.address, 1);
    await mockAssetERC721.connect(addr1).approve(misteryBox.address, 1);

    const transferData = [
      {
        contractType: 0, // ERC721
        contractAddress: mockAssetERC721.address,
        from: addr1.address,
        to: addr2.address,
        tokenId: 1,
        amount: 1,
      },
    ];

    await misteryBox.connect(owner).safeBatchTransferFrom(transferData);

    expect(await mockAssetERC721.ownerOf(1)).to.equal(addr2.address);
  });

  it('should safely transfer an ERC1155 token', async function () {
    // Mint an ERC1155 token and approve the MisteryBox contract
    const creatorAddress = addr1.address;
    const packId = 1;
    const ipfsHashString =
      '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
    const supply = 1000;
    const ownerAddress = addr1.address;
    const data = '0x';

    const receipt = await mockAssetERC1155.mintWithOutBouncerCheck(
      creatorAddress,
      packId,
      ipfsHashString,
      supply,
      ownerAddress,
      data
    );
    const transferEvent = await expectEventWithArgs(
      mockAssetERC1155,
      receipt,
      'TransferSingle'
    );
    const tokenId = transferEvent.args[3];
    await mockAssetERC1155
      .connect(addr1)
      .setApprovalForAll(misteryBox.address, true);
    const transferData = [
      {
        contractType: 1, // ERC1155
        contractAddress: mockAssetERC1155.address,
        from: addr1.address,
        to: addr2.address,
        tokenId: tokenId,
        amount: 3,
      },
    ];
    await misteryBox.connect(owner).safeBatchTransferFrom(transferData);
    expect(await mockAssetERC1155.balanceOf(addr2.address, tokenId)).to.equal(
      3
    );
  });

  it('should fail when using an invalid contract type', async function () {
    const transferData = [
      {
        contractType: 2, // Invalid contract type
        contractAddress: mockAssetERC721.address,
        from: addr1.address,
        to: addr2.address,
        tokenId: 1,
        amount: 1,
      },
    ];

    await expect(
      misteryBox.connect(owner).safeBatchTransferFrom(transferData)
    ).to.be.revertedWith('INVALID CONTRACT TYPE');
  });

  it('should fail when attempting to transfer ERC721 token with an amount different than 1', async function () {
    await mockAssetERC721
      .connect(addr1)
      .mintWithOutMinterCheck(addr1.address, 1);
    await mockAssetERC721.connect(addr1).approve(misteryBox.address, 1);

    const transferData = [
      {
        contractType: 0, // ERC721
        contractAddress: mockAssetERC721.address,
        from: addr1.address,
        to: addr2.address,
        tokenId: 1,
        amount: 2, // Invalid amount for ERC721
      },
    ];

    await expect(
      misteryBox.connect(owner).safeBatchTransferFrom(transferData)
    ).to.be.revertedWith('AMOUNT MUST BE 1 FOR ERC721');
  });

  it('should fail when attempting to transfer ERC1155 token with an amount less than 1', async function () {
    // Mint an ERC1155 token and approve the MisteryBox contract
    const creatorAddress = addr1.address;
    const packId = 1;
    const ipfsHashString =
      '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
    const supply = 1000;
    const ownerAddress = addr1.address;
    const data = '0x';

    const receipt = await mockAssetERC1155.mintWithOutBouncerCheck(
      creatorAddress,
      packId,
      ipfsHashString,
      supply,
      ownerAddress,
      data
    );
    const transferEvent = await expectEventWithArgs(
      mockAssetERC1155,
      receipt,
      'TransferSingle'
    );
    const tokenId = transferEvent.args[3];
    await mockAssetERC1155
      .connect(addr1)
      .setApprovalForAll(misteryBox.address, true);
    const transferData = [
      {
        contractType: 1, // ERC1155
        contractAddress: mockAssetERC1155.address,
        from: addr1.address,
        to: addr2.address,
        tokenId: tokenId,
        amount: 0,
      },
    ];
    await expect(
      misteryBox.connect(owner).safeBatchTransferFrom(transferData)
    ).to.be.revertedWith('AMOUNT MUST BE GREATER OR EQUAL THAN 1 FOR ERC1155');
  });
});
