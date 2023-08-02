import {ethers} from 'hardhat';
import {expect} from 'chai';
import {splitterAbi} from './Splitter.abi';
import {BigNumber} from 'ethers';
import {
  generateAssetId,
  assetRoyaltyDistribution,
} from './fixtures/asset/assetRoyaltyFixture';

describe('Asset Royalties', function () {
  describe('Asset royalty distribution via splitter', function () {
    it('should split ERC20 using EIP2981', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        AssetAsSeller,
        RoyaltyManagerContract,
        assetAsMinter,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      await ERC20.mint(buyer.address, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      expect(await Asset.balanceOf(seller.address, id)).to.be.equals(1);
      await mockMarketplace.distributeRoyaltyEIP2981(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer.address,
        seller.address,
        true
      );
      const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
        creator.address
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      const balance = await ERC20.balanceOf(splitter);

      expect(balance).to.be.equal(1000000 * (assetRoyaltyBPS / 10000));

      await splitterContract
        .connect(await ethers.getSigner(creator.address))
        .splitERC20Tokens(ERC20.address);

      const balanceCreator = await ERC20.balanceOf(creator.address);
      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      expect(balanceCreator).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
    });

    it('should split ERC20 using RoyaltyEngine', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        AssetAsSeller,
        assetAsMinter,
        RoyaltyManagerContract,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      await ERC20.mint(buyer.address, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      expect(await Asset.balanceOf(seller.address, id)).to.be.equals(1);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      await mockMarketplace.distributeRoyaltyRoyaltyEngine(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer.address,
        seller.address,
        true
      );
      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );
      const balanceCreator = await ERC20.balanceOf(creator.address);
      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      expect(balanceCreator).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
    });

    it('should split ETH using EIP2981', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        AssetAsSeller,
        assetAsMinter,
        RoyaltyManagerContract,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      expect(await Asset.balanceOf(seller.address, id)).to.be.equals(1);
      const balanceCreator = await ethers.provider.getBalance(creator.address);
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      const value = ethers.utils.parseUnits('1000', 'ether');
      await mockMarketplace
        .connect(user)
        .distributeRoyaltyEIP2981(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer.address,
          seller.address,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(
        creator.address
      );
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );

      expect(balanceCreatorNew.sub(balanceCreator)).to.be.equal(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );

      expect(
        balanceCreatorNew
          .sub(balanceCreator)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(assetRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it('should split ETH using RoyaltyEngine', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        AssetAsSeller,
        assetAsMinter,
        RoyaltyManagerContract,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      await Asset.connect(seller).setApprovalForAll(
        mockMarketplace.address,
        true
      );
      expect(await Asset.balanceOf(seller.address, id)).to.be.equals(1);
      const balanceCreator = await ethers.provider.getBalance(creator.address);
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      const value = ethers.utils.parseUnits('1000', 'ether');
      await mockMarketplace
        .connect(user)
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer.address,
          seller.address,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(
        creator.address
      );
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );

      expect(balanceCreatorNew.sub(balanceCreator)).to.be.equal(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );

      expect(
        balanceCreatorNew
          .sub(balanceCreator)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(assetRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it('creator should receive Royalty in ETH to new address set by the creator', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        AssetAsSeller,
        seller,
        buyer,
        commonRoyaltyReceiver,
        royaltyReceiver,
        creator,
        user,
        RoyaltyManagerContract,
        assetAsMinter,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');

      const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
        creator.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      expect(await splitterContract._recipient()).to.be.equal(creator.address);

      const tnx = await RoyaltyManagerContract.connect(
        await ethers.getSigner(creator.address)
      ).setRoyaltyRecipient(royaltyReceiver.address);

      await tnx.wait();

      expect(await splitterContract._recipient()).to.be.equal(
        royaltyReceiver.address
      );

      const balanceRoyaltyReceiver = await ethers.provider.getBalance(
        royaltyReceiver.address
      );
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );
      const value = ethers.utils.parseUnits('1000', 'ether');
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      await mockMarketplace
        .connect(user)
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer.address,
          seller.address,
          true,
          {
            value: value,
          }
        );

      const balanceRoyaltyReceiverNew = await ethers.provider.getBalance(
        royaltyReceiver.address
      );
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );

      expect(balanceRoyaltyReceiverNew.sub(balanceRoyaltyReceiver)).to.be.equal(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );

      expect(
        balanceRoyaltyReceiverNew
          .sub(balanceRoyaltyReceiver)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(assetRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it('common share of royalty should be received in ETH to new address set by the Admin on RoyaltyManagerContract contract', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        commonRoyaltyReceiver2,
        RoyaltyManagerAsAdmin,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        AssetAsSeller,
        assetAsMinter,
        RoyaltyManagerContract,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver.address
      );

      await RoyaltyManagerAsAdmin.setRecipient(commonRoyaltyReceiver2.address);

      expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver2.address
      );

      const balanceCreator = await ethers.provider.getBalance(creator.address);
      const balanceCommonRoyaltyReceiver2 = await ethers.provider.getBalance(
        commonRoyaltyReceiver2.address
      );
      const value = ethers.utils.parseUnits('1000', 'ether');
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      await mockMarketplace
        .connect(user)
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer.address,
          seller.address,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(
        creator.address
      );
      const balanceCommonRoyaltyReceiver2New = await ethers.provider.getBalance(
        commonRoyaltyReceiver2.address
      );

      expect(balanceCreatorNew.sub(balanceCreator)).to.be.equal(
        balanceCommonRoyaltyReceiver2New.sub(balanceCommonRoyaltyReceiver2)
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );

      expect(
        balanceCreatorNew
          .sub(balanceCreator)
          .add(
            balanceCommonRoyaltyReceiver2New.sub(balanceCommonRoyaltyReceiver2)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(assetRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it('common share of Royalty should be received in ETH with new splits set by the owner on registry', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        AssetAsSeller,
        RoyaltyManagerAsAdmin,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        assetAsMinter,
        RoyaltyManagerContract,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');

      await RoyaltyManagerAsAdmin.setSplit(6000);
      const balanceCreator = await ethers.provider.getBalance(creator.address);
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );
      const value = ethers.utils.parseUnits('1000', 'ether');
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      await mockMarketplace
        .connect(user)
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer.address,
          seller.address,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(
        creator.address
      );
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver.address
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );

      const TotalRoyalty = value
        .mul(BigNumber.from(assetRoyaltyBPS))
        .div(BigNumber.from(10000));

      const sellerRoyaltyShare = TotalRoyalty.mul(BigNumber.from(4000)).div(
        BigNumber.from(10000)
      );

      const commonRecipientShare = TotalRoyalty.mul(BigNumber.from(6000)).div(
        BigNumber.from(10000)
      );

      expect(balanceCreatorNew.sub(balanceCreator)).to.be.equal(
        sellerRoyaltyShare
      );

      expect(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      ).to.be.equal(commonRecipientShare);

      expect(
        balanceCreatorNew
          .sub(balanceCreator)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(assetRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it('creator should receive Royalty in ERC20 to new address royalty recipient address set by them', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        commonRoyaltyReceiver,
        royaltyReceiver,
        AssetAsSeller,
        RoyaltyManagerContract,
        creator,
        assetAsMinter,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
        creator.address
      );
      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      expect(await splitterContract._recipient()).to.be.equal(creator.address);
      const tnx = await RoyaltyManagerContract.connect(
        await ethers.getSigner(creator.address)
      ).setRoyaltyRecipient(royaltyReceiver.address);

      await tnx.wait();

      expect(await splitterContract._recipient()).to.be.equal(
        royaltyReceiver.address
      );

      await ERC20.mint(buyer.address, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      expect(await Asset.balanceOf(seller.address, id)).to.be.equals(1);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      await mockMarketplace.distributeRoyaltyEIP2981(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer.address,
        seller.address,
        true
      );

      await splitterContract
        .connect(await ethers.getSigner(royaltyReceiver.address))
        .splitERC20Tokens(ERC20.address);
      const balanceCreator = await ERC20.balanceOf(creator.address);
      expect(balanceCreator).to.be.equal(0);
      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );
      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );
      const balanceRoyaltyReceiver = await ERC20.balanceOf(
        royaltyReceiver.address
      );

      expect(balanceRoyaltyReceiver).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
    });

    it('common share of royalty should be received in ERC20 to new address set by the Admin on RoyaltyManager contract', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        RoyaltyManagerAsAdmin,
        commonRoyaltyReceiver2,
        commonRoyaltyReceiver,
        creator,
        AssetAsSeller,
        assetAsMinter,
        RoyaltyManagerContract,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver.address
      );
      await RoyaltyManagerAsAdmin.setRecipient(commonRoyaltyReceiver2.address);
      expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver2.address
      );

      await ERC20.mint(buyer.address, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      expect(await Asset.balanceOf(seller.address, id)).to.be.equals(1);
      await mockMarketplace.distributeRoyaltyRoyaltyEngine(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer.address,
        seller.address,
        true
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );
      const balanceCommonRoyaltyReceiver2 = await ERC20.balanceOf(
        commonRoyaltyReceiver2.address
      );
      const balanceCreator = await ERC20.balanceOf(creator.address);
      expect(balanceCreator).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver2).to.be.equal(
        (1000000 * (assetRoyaltyBPS / 10000)) / 2
      );
    });

    it('common recipient should receive Royalty in ERC20 with new splits set by the owner on registry', async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        RoyaltyManagerAsAdmin,
        AssetAsSeller,
        commonRoyaltyReceiver,
        creator,
        assetAsMinter,
        RoyaltyManagerContract,
      } = await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      await RoyaltyManagerAsAdmin.setSplit(6000);
      await ERC20.mint(buyer.address, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      expect(await Asset.balanceOf(seller.address, id)).to.be.equals(1);
      await mockMarketplace.distributeRoyaltyRoyaltyEngine(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer.address,
        seller.address,
        true
      );

      const assetRoyaltyBPS = await RoyaltyManagerContract.getContractRoyalty(
        Asset.address
      );
      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );
      const balanceCreator = await ERC20.balanceOf(creator.address);
      expect(balanceCreator).to.be.equal(
        ((1000000 * (assetRoyaltyBPS / 10000)) / 5) * 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        ((1000000 * (assetRoyaltyBPS / 10000)) / 5) * 3
      );
    });
  });

  it('Can view all the royalty recipient of each asset', async function () {
    const {
      Asset,
      seller,
      commonRoyaltyReceiver,
      creator,
      deployer,
      assetAsMinter,
    } = await assetRoyaltyDistribution();

    const id = generateAssetId(creator.address, 1);
    await assetAsMinter.mint(seller.address, id, 1, '0x');
    const id2 = generateAssetId(deployer.address, 1);
    await assetAsMinter.mint(seller.address, id2, 1, '0x01');
    const tokenRoyalties = await Asset.getTokenRoyalties();
    expect(tokenRoyalties[0].tokenId).to.be.equal(id);
    expect(tokenRoyalties[0].recipients[0].recipient).to.be.equal(
      creator.address
    );
    expect(tokenRoyalties[0].recipients[1].recipient).to.be.equal(
      commonRoyaltyReceiver.address
    );
    expect(tokenRoyalties[1].tokenId).to.be.equal(id2);
    expect(tokenRoyalties[1].recipients[0].recipient).to.be.equal(
      deployer.address
    );
    expect(tokenRoyalties[1].recipients[1].recipient).to.be.equal(
      commonRoyaltyReceiver.address
    );
  });

  describe('Roles on Asset and Manager contract', function () {
    it('creator could change the recipient for his splitter', async function () {
      const {seller, RoyaltyManagerContract, creator, assetAsMinter} =
        await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
        creator.address
      );
      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      expect(await splitterContract._recipient()).to.be.equal(creator.address);
      const tnx = await RoyaltyManagerContract.connect(
        await ethers.getSigner(creator.address)
      ).setRoyaltyRecipient(seller.address);
      await tnx.wait();
      expect(await splitterContract._recipient()).to.be.equal(seller.address);
    });

    it('only creator could change the recipient for his splitter', async function () {
      const {seller, RoyaltyManagerContract, deployer, creator, assetAsMinter} =
        await assetRoyaltyDistribution();

      const id = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      await expect(
        RoyaltyManagerContract.connect(deployer).setRoyaltyRecipient(
          seller.address
        )
      ).to.revertedWith('Manager: No splitter deployed for the creator');
    });

    it('RoyaltyManagerContract admin can set common royalty recipient', async function () {
      const {seller, commonRoyaltyReceiver, RoyaltyManagerAsAdmin} =
        await assetRoyaltyDistribution();
      expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver.address
      );
      await RoyaltyManagerAsAdmin.setRecipient(seller.address);
      expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
        seller.address
      );
    });

    it('RoyaltyManagerContract admin can set common split', async function () {
      const {RoyaltyManagerAsAdmin} = await assetRoyaltyDistribution();
      expect(await RoyaltyManagerAsAdmin.commonSplit()).to.be.equal(5000);
      await RoyaltyManagerAsAdmin.setSplit(3000);
      expect(await RoyaltyManagerAsAdmin.commonSplit()).to.be.equal(3000);
    });

    it('Only RoyaltyManagerContract admin can set common royalty recipient', async function () {
      const {seller, RoyaltyManagerContract, managerAdminRole} =
        await assetRoyaltyDistribution();
      await expect(
        RoyaltyManagerContract.connect(seller).setRecipient(seller.address)
      ).to.be.revertedWith(
        `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${managerAdminRole}`
      );
    });

    it('Only RoyaltyManagerContract admin can set common split', async function () {
      const {seller, RoyaltyManagerContract, managerAdminRole} =
        await assetRoyaltyDistribution();
      await expect(
        RoyaltyManagerContract.connect(seller).setSplit(3000)
      ).to.be.revertedWith(
        `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${managerAdminRole}`
      );
    });
  });

  describe('Minting', function () {
    it('should have same splitter address for tokens minted by same creator.address', async function () {
      const {Asset, seller, creator, assetAsMinter} =
        await assetRoyaltyDistribution();

      const id1 = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id1, 1, '0x');
      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);
      const id2 = generateAssetId(creator.address, 2);
      await assetAsMinter.mint(seller.address, id2, 1, '0x01');
      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);
      expect(splitter1).to.be.equal(splitter2);
    });

    it('should not have same splitter address for tokens with minted by different creator.address', async function () {
      const {Asset, seller, deployer, creator, assetAsMinter} =
        await assetRoyaltyDistribution();

      const id1 = generateAssetId(creator.address, 1);
      await assetAsMinter.mint(seller.address, id1, 1, '0x');
      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);
      const id2 = generateAssetId(deployer.address, 2);
      await assetAsMinter.mint(seller.address, id2, 1, '0x01');
      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);
      expect(splitter1).to.not.be.equal(splitter2);
    });

    it('should have same splitter address for tokens minted by same creator.address in batch mint', async function () {
      const {Asset, seller, creator, assetAsMinter} =
        await assetRoyaltyDistribution();

      const id1 = generateAssetId(creator.address, 1);
      const id2 = generateAssetId(creator.address, 2);
      await assetAsMinter.mintBatch(
        seller.address,
        [id1, id2],
        [1, 1],
        ['0x', '0x01']
      );
      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);
      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);
      expect(splitter1).to.be.equal(splitter2);
    });

    it('should have different splitter address for tokens minted by same different creator.address in batch mint', async function () {
      const {Asset, seller, deployer, creator, assetAsMinter} =
        await assetRoyaltyDistribution();

      const id1 = generateAssetId(creator.address, 1);
      const id2 = generateAssetId(deployer.address, 2);
      await assetAsMinter.mintBatch(
        seller.address,
        [id1, id2],
        [1, 1],
        ['0x', '0x01']
      );
      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);
      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);
      expect(splitter1).to.not.be.equal(splitter2);
    });

    it('should return splitter address on for a tokenId on royaltyInfo function call', async function () {
      const {Asset, seller, deployer, assetAsMinter} =
        await assetRoyaltyDistribution();

      const id = generateAssetId(deployer.address, 2);
      await assetAsMinter.mint(seller.address, id, 1, '0x');
      const splitter = await Asset._tokenRoyaltiesSplitter(id);
      const royaltyInfo = await Asset.royaltyInfo(id, 10000);
      expect(splitter).to.be.equal(royaltyInfo[0]);
    });
  });
});
