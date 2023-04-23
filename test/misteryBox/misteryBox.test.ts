import {expect} from '../chai-setup';
import {setupMisteryBox} from './fixtures';

describe('MisteryBox', function () {
  it('should safely transfer an ERC721 token', async function () {
    const {
      misteryBox,
      deployer,
      account1,
      account2,
      mockAssetERC721,
      mintAssetERC721,
    } = await setupMisteryBox();

    // Mint an ERC721 token and approve the MisteryBox contract
    const {tokenId} = await mintAssetERC721({to: account1.address, id: 1});
    await mockAssetERC721
      .connect(account1)
      .approve(misteryBox.address, tokenId);

    const transferData = [
      {
        contractType: 0, // ERC721
        contractAddress: mockAssetERC721.address,
        from: account1.address,
        to: account2.address,
        tokenId,
        amount: 1,
      },
    ];

    await misteryBox.connect(deployer).safeBatchTransferFrom(transferData);
    expect(await mockAssetERC721.ownerOf(tokenId)).to.equal(account2.address);
  });

  it('should safely transfer an ERC1155 token', async function () {
    const {
      misteryBox,
      deployer,
      account1,
      account2,
      mockAssetERC1155,
      mintAssetERC1155,
    } = await setupMisteryBox();

    // Mint an ERC1155 token and approve the MisteryBox contract
    const {tokenId} = await mintAssetERC1155({
      creatorAddress: account1.address,
      packId: 1,
      hash:
        '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e',
      supply: 1000,
      ownerAddress: account1.address,
      data: '0x',
    });

    await mockAssetERC1155
      .connect(account1)
      .setApprovalForAll(misteryBox.address, true);

    const transferData = [
      {
        contractType: 1, // ERC1155
        contractAddress: mockAssetERC1155.address,
        from: account1.address,
        to: account2.address,
        tokenId,
        amount: 3,
      },
    ];

    await misteryBox.connect(deployer).safeBatchTransferFrom(transferData);
    expect(
      await mockAssetERC1155.balanceOf(account2.address, tokenId)
    ).to.equal(3);
  });

  it('should safely transfer multiple tokens', async function () {
    const {
      misteryBox,
      deployer,
      account1,
      account2,
      mockAssetERC721,
      mintAssetERC721,
      mockAssetERC1155,
      mintAssetERC1155,
    } = await setupMisteryBox();

    // Mint an ERC721 token and approve the MisteryBox contract
    const {tokenId: tokenIdERC721} = await mintAssetERC721({
      to: account1.address,
      id: 1,
    });

    await mockAssetERC721
      .connect(account1)
      .approve(misteryBox.address, tokenIdERC721);

    // Mint an ERC1155 token and approve the MisteryBox contract
    const {tokenId: tokenIdERC1155} = await mintAssetERC1155({
      creatorAddress: account1.address,
      packId: 1,
      hash:
        '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e',
      supply: 1000,
      ownerAddress: account1.address,
      data: '0x',
    });

    await mockAssetERC1155
      .connect(account1)
      .setApprovalForAll(misteryBox.address, true);

    const transferData = [
      {
        contractType: 0, // ERC721
        contractAddress: mockAssetERC721.address,
        from: account1.address,
        to: account2.address,
        tokenId: tokenIdERC721,
        amount: 1,
      },
      {
        contractType: 1, // ERC1155
        contractAddress: mockAssetERC1155.address,
        from: account1.address,
        to: account2.address,
        tokenId: tokenIdERC1155,
        amount: 3,
      },
    ];

    await misteryBox.connect(deployer).safeBatchTransferFrom(transferData);

    expect(await mockAssetERC721.balanceOf(account2.address)).to.equal(1);
    expect(
      await mockAssetERC1155.balanceOf(account2.address, tokenIdERC1155)
    ).to.equal(3);
  });

  it('should fail when using an invalid contract type', async function () {
    const {
      misteryBox,
      deployer,
      account1,
      account2,
      mockAssetERC721,
    } = await setupMisteryBox();

    const transferData = [
      {
        contractType: 2, // Invalid contract type
        contractAddress: mockAssetERC721.address,
        from: account1.address,
        to: account2.address,
        tokenId: 1,
        amount: 1,
      },
    ];

    await expect(
      misteryBox.connect(deployer).safeBatchTransferFrom(transferData)
    ).to.be.revertedWith('INVALID CONTRACT TYPE');
  });

  it('should fail when attempting to transfer ERC721 token with an amount different than 1', async function () {
    const {
      misteryBox,
      deployer,
      account1,
      account2,
      mockAssetERC721,
    } = await setupMisteryBox();

    const transferData = [
      {
        contractType: 0, // ERC721
        contractAddress: mockAssetERC721.address,
        from: account1.address,
        to: account2.address,
        tokenId: 1,
        amount: 2, // Invalid amount for ERC721
      },
    ];

    await expect(
      misteryBox.connect(deployer).safeBatchTransferFrom(transferData)
    ).to.be.revertedWith('AMOUNT MUST BE 1 FOR ERC721');
  });

  it('should fail when attempting to transfer ERC1155 token with an amount less than 1', async function () {
    const {
      misteryBox,
      deployer,
      account1,
      account2,
      mockAssetERC1155,
    } = await setupMisteryBox();

    const transferData = [
      {
        contractType: 1, // ERC1155
        contractAddress: mockAssetERC1155.address,
        from: account1.address,
        to: account2.address,
        tokenId: 1,
        amount: 0,
      },
    ];
    await expect(
      misteryBox.connect(deployer).safeBatchTransferFrom(transferData)
    ).to.be.revertedWith('AMOUNT MUST BE GREATER OR EQUAL THAN 1 FOR ERC1155');
  });
});
