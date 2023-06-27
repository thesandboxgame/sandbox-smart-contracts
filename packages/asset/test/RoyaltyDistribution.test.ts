import {
  ethers
} from "hardhat";
import { expect } from "chai";
import { splitterAbi } from "./Splitter.abi";
import { BigNumber } from "ethers";
import { generateAssetId, royaltyDistribution } from "./fixtures/royaltiesFixture"

describe("Asset and catalyst Royalties", () => {
  describe("Royalty distribution through splitter", () => {
    it("should split ERC20 using EIP2981", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        deployer,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        AssetAsSeller,
        manager,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );
      await ERC20.mint(buyer, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      await mockMarketplace.distributeRoyaltyEIP2981(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer,
        seller,
        true
      );
      const splitter = await manager._creatorRoyaltiesSplitter(creator);

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      const balance = await ERC20.balanceOf(splitter);

      expect(balance).to.be.equal(1000000 * (_defaultRoyaltyBPS / 10000));

      await splitterContract
        .connect(await ethers.getSigner(creator))
        .splitERC20Tokens(ERC20.address);

      const balanceCreator = await ERC20.balanceOf(creator);
      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver
      );

      expect(balanceCreator).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
    });

    it("should split ERC20 using RoyaltyEngine", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        deployer,
        seller,
        buyer,
        commonRoyaltyReceiver,
        royaltyReceiver,
        creator,
        AssetAsSeller,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );
      await ERC20.mint(buyer, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      await mockMarketplace.distributeRoyaltyRoyaltyEngine(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer,
        seller,
        true
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      const balanceCreator = await ERC20.balanceOf(creator);

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver
      );

      expect(balanceCreator).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
    });

    it("should split ETh using EIP2981", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        deployer,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        AssetAsSeller,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );
      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      const balanceCreator = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      const value = ethers.utils.parseUnits("1000", "ether");
      await mockMarketplace
        .connect(await ethers.getSigner(user))
        .distributeRoyaltyEIP2981(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer,
          seller,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );

      expect(balanceCreatorNew.sub(balanceCreator)).to.be.equal(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      expect(
        balanceCreatorNew
          .sub(balanceCreator)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it("should split ETh using RoyaltyEngine", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        deployer,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        AssetAsSeller,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );
      await Asset.connect(await ethers.getSigner(seller)).setApprovalForAll(
        mockMarketplace.address,
        true
      );
      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      const balanceCreator = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      const value = ethers.utils.parseUnits("1000", "ether");
      await mockMarketplace
        .connect(await ethers.getSigner(user))
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer,
          seller,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );

      expect(balanceCreatorNew.sub(balanceCreator)).to.be.equal(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      expect(
        balanceCreatorNew
          .sub(balanceCreator)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it("creator should receive Royalty in Eth to new address set by the creator", async function () {
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
        manager,
        deployer,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      const splitter = await manager._creatorRoyaltiesSplitter(creator);

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      expect(await splitterContract._recipient()).to.be.equal(creator);

      const tnx = await manager
        .connect(await ethers.getSigner(creator))
        .setRoyaltyRecipient(royaltyReceiver);

      await tnx.wait();

      expect(await splitterContract._recipient()).to.be.equal(royaltyReceiver);

      const balanceRoyaltyReceiver = await ethers.provider.getBalance(
        royaltyReceiver
      );
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );
      const value = ethers.utils.parseUnits("1000", "ether");
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      await mockMarketplace
        .connect(await ethers.getSigner(user))
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer,
          seller,
          true,
          {
            value: value,
          }
        );

      const balanceRoyaltyReceiverNew = await ethers.provider.getBalance(
        royaltyReceiver
      );
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );

      expect(balanceRoyaltyReceiverNew.sub(balanceRoyaltyReceiver)).to.be.equal(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      expect(
        balanceRoyaltyReceiverNew
          .sub(balanceRoyaltyReceiver)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it("common share of royalty should be received in Eth to new address set by the Admin on manager contract", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        commonRoyaltyReceiver2,
        managerAsAdmin,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        AssetAsSeller,
        deployer,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );
      expect(await managerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver
      );

      await managerAsAdmin.setRecipient(commonRoyaltyReceiver2);

      expect(await managerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver2
      );

      const balanceCreator = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiver2 = await ethers.provider.getBalance(
        commonRoyaltyReceiver2
      );
      const value = ethers.utils.parseUnits("1000", "ether");
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      await mockMarketplace
        .connect(await ethers.getSigner(user))
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer,
          seller,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiver2New = await ethers.provider.getBalance(
        commonRoyaltyReceiver2
      );

      expect(balanceCreatorNew.sub(balanceCreator)).to.be.equal(
        balanceCommonRoyaltyReceiver2New.sub(balanceCommonRoyaltyReceiver2)
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      expect(
        balanceCreatorNew
          .sub(balanceCreator)
          .add(
            balanceCommonRoyaltyReceiver2New.sub(balanceCommonRoyaltyReceiver2)
          )
      ).to.be.equal(
        value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it("common share of Royalty should be received in Eth with new splits set by the owner on registry", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        AssetAsSeller,
        managerAsAdmin,
        seller,
        buyer,
        commonRoyaltyReceiver,
        creator,
        user,
        deployer,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      await managerAsAdmin.setSplit(6000);
      const balanceCreator = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );
      const value = ethers.utils.parseUnits("1000", "ether");
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      await mockMarketplace
        .connect(await ethers.getSigner(user))
        .distributeRoyaltyRoyaltyEngine(
          0,
          ERC20.address,
          Asset.address,
          id,
          buyer,
          seller,
          true,
          {
            value: value,
          }
        );

      const balanceCreatorNew = await ethers.provider.getBalance(creator);
      const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
        commonRoyaltyReceiver
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      const TotalRoyalty = value
        .mul(BigNumber.from(_defaultRoyaltyBPS))
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
        value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
      );
    });

    it("creator should receive Royalty in ERC20 to new address royalty recipient address set by them", async function () {
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
        manager,
        creator,
        deployer,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      const splitter = await manager._creatorRoyaltiesSplitter(creator);

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      expect(await splitterContract._recipient()).to.be.equal(creator);

      const tnx = await manager
        .connect(await ethers.getSigner(creator))
        .setRoyaltyRecipient(royaltyReceiver);

      await tnx.wait();

      expect(await splitterContract._recipient()).to.be.equal(royaltyReceiver);

      await ERC20.mint(buyer, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      await mockMarketplace.distributeRoyaltyEIP2981(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer,
        seller,
        true
      );

      await splitterContract
        .connect(await ethers.getSigner(royaltyReceiver))
        .splitERC20Tokens(ERC20.address);
      const balanceCreator = await ERC20.balanceOf(creator);
      expect(balanceCreator).to.be.equal(0);

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver
      );

      const balanceRoyaltyReceiver = await ERC20.balanceOf(royaltyReceiver);

      expect(balanceRoyaltyReceiver).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
    });

    it("common share of royalty should be received in ERC20 to new address set by the Admin on manager contract", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        managerAsAdmin,
        commonRoyaltyReceiver2,
        commonRoyaltyReceiver,
        creator,
        AssetAsSeller,
        deployer,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      expect(await managerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver
      );

      await managerAsAdmin.setRecipient(commonRoyaltyReceiver2);

      expect(await managerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver2
      );

      await ERC20.mint(buyer, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      await mockMarketplace.distributeRoyaltyRoyaltyEngine(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer,
        seller,
        true
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      const balanceCommonRoyaltyReceiver2 = await ERC20.balanceOf(
        commonRoyaltyReceiver2
      );

      const balanceCreator = await ERC20.balanceOf(creator);

      expect(balanceCreator).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver2).to.be.equal(
        (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
      );
    });

    it("common recipient should receive Royalty in ERC20 with new splits set by the owner on registry", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        managerAsAdmin,
        AssetAsSeller,
        commonRoyaltyReceiver,
        creator,
        deployer,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      await managerAsAdmin.setSplit(6000);

      await ERC20.mint(buyer, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);
      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      await mockMarketplace.distributeRoyaltyRoyaltyEngine(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer,
        seller,
        true
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver
      );

      const balanceCreator = await ERC20.balanceOf(creator);

      expect(balanceCreator).to.be.equal(
        ((1000000 * (_defaultRoyaltyBPS / 10000)) / 5) * 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        ((1000000 * (_defaultRoyaltyBPS / 10000)) / 5) * 3
      );
    });

    it("common recipient should receive Royalty in ERC20 with new splits set by the owner on registry", async function () {
      const {
        Asset,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        seller,
        buyer,
        managerAsAdmin,
        AssetAsSeller,
        commonRoyaltyReceiver,
        creator,
        deployer,
      } = await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      await managerAsAdmin.setSplit(6000);

      await ERC20.mint(buyer, 1000000);
      await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
      await AssetAsSeller.setApprovalForAll(mockMarketplace.address, true);

      expect(await Asset.balanceOf(seller, id)).to.be.equals(1);
      await mockMarketplace.distributeRoyaltyRoyaltyEngine(
        1000000,
        ERC20.address,
        Asset.address,
        id,
        buyer,
        seller,
        true
      );

      const _defaultRoyaltyBPS = await Asset._defaultRoyaltyBPS();

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver
      );

      const balanceCreator = await ERC20.balanceOf(creator);

      expect(balanceCreator).to.be.equal(
        ((1000000 * (_defaultRoyaltyBPS / 10000)) / 5) * 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        ((1000000 * (_defaultRoyaltyBPS / 10000)) / 5) * 3
      );
    });
  });

  describe("Roles on Asset and Manager contract", () => {
    it("creator could change the recipient for his splitter", async function () {
      const { Asset, seller, royaltyReceiver, manager, deployer, creator } =
        await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      const splitter = await manager._creatorRoyaltiesSplitter(creator);

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      expect(await splitterContract._recipient()).to.be.equal(creator);

      const tnx = await manager
        .connect(await ethers.getSigner(creator))
        .setRoyaltyRecipient(seller);

      await tnx.wait();

      expect(await splitterContract._recipient()).to.be.equal(seller);
    });

    it("only creator could change the recipient for his splitter", async function () {
      const { Asset, seller, manager, deployer, creator } =
        await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );
      await expect(
        manager
          .connect(await ethers.getSigner(deployer))
          .setRoyaltyRecipient(seller)
      ).to.revertedWith("Manager: No splitter deployed for the creator");
    });

    it("Asset admin can set default royalty Bps", async function () {
      const { Asset, assetAdmin } = await royaltyDistribution();
      expect(await Asset._defaultRoyaltyBPS()).to.be.equal(300);
      await Asset.connect(
        await ethers.getSigner(assetAdmin)
      ).setDefaultRoyaltyBps(400);
      expect(await Asset._defaultRoyaltyBPS()).to.be.equal(400);
    });

    it("Asset admin can set default royalty address", async function () {
      const { Asset, commonRoyaltyReceiver, assetAdmin, deployer } =
        await royaltyDistribution();
      expect(await Asset._defaultRoyaltyReceiver()).to.be.equal(
        commonRoyaltyReceiver
      );
      await Asset.connect(
        await ethers.getSigner(assetAdmin)
      ).setDefaultRoyaltyReceiver(deployer);
      expect(await Asset._defaultRoyaltyReceiver()).to.be.equal(deployer);
    });

    it("only asset admin can set default royalty Bps", async function () {
      const { Asset, seller, assetAdminRole } = await royaltyDistribution();
      await expect(
        Asset.connect(await ethers.getSigner(seller)).setDefaultRoyaltyBps(400)
      ).to.be.revertedWith(
        `AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${assetAdminRole}`
      );
    });

    it("only asset admin can set default royalty address", async function () {
      const { Asset, seller, assetAdminRole } = await royaltyDistribution();
      await expect(
        Asset.connect(await ethers.getSigner(seller)).setDefaultRoyaltyReceiver(
          seller
        )
      ).to.be.revertedWith(
        `AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${assetAdminRole}`
      );
    });

    it("manager admin can set common royalty recipient", async function () {
      const { seller, commonRoyaltyReceiver, managerAsAdmin } =
        await royaltyDistribution();
      expect(await managerAsAdmin.commonRecipient()).to.be.equal(
        commonRoyaltyReceiver
      );
      await managerAsAdmin.setRecipient(seller);
      expect(await managerAsAdmin.commonRecipient()).to.be.equal(seller);
    });

    it("manager admin can set common split", async function () {
      const { seller, commonRoyaltyReceiver, manager, managerAsAdmin } =
        await royaltyDistribution();
      expect(await managerAsAdmin.commonSplit()).to.be.equal(5000);
      await managerAsAdmin.setSplit(3000);
      expect(await managerAsAdmin.commonSplit()).to.be.equal(3000);
    });

    it("Only manager admin can set common royalty recipient", async function () {
      const { seller, manager, managerAdminRole } = await royaltyDistribution();
      await expect(
        manager
          .connect(await ethers.provider.getSigner(seller))
          .setRecipient(seller)
      ).to.be.revertedWith(
        `AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${managerAdminRole}`
      );
    });

    it("Only manager admin can set common split", async function () {
      const { seller, manager, managerAdminRole } = await royaltyDistribution();
      await expect(
        manager.connect(await ethers.provider.getSigner(seller)).setSplit(3000)
      ).to.be.revertedWith(
        `AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${managerAdminRole}`
      );
    });

    it("manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)", async function () {
      const { managerAsRoyaltySetter, catalyst } = await royaltyDistribution();
      expect(
        await managerAsRoyaltySetter.contractRoyalty(catalyst.address)
      ).to.be.equal(0);
      await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
      expect(
        await managerAsRoyaltySetter.contractRoyalty(catalyst.address)
      ).to.be.equal(500);
    });

    it("only manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)", async function () {
      const { manager, seller, catalyst, contractRoyaltySetterRole } =
        await royaltyDistribution();
      await expect(
        manager
          .connect(await ethers.provider.getSigner(seller))
          .setContractRoyalty(catalyst.address, 500)
      ).to.be.revertedWith(
        `AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${contractRoyaltySetterRole}`
      );
    });
  });

  describe("Minting", () => {
    it("should have same splitter address for tokens minted by same creator", async function () {
      const { Asset, seller, royaltyReceiver, deployer, creator } =
        await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id1 = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id1,
        1,
        "0x"
      );

      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);

      // generate token id to be minted with creator already set
      const id2 = generateAssetId(creator, 2);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id2,
        1,
        "0x01"
      );

      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);

      expect(splitter1).to.be.equal(splitter2);
    });

    it("should not have same splitter address for tokens with minted by different creator", async function () {
      const { Asset, seller, buyer, royaltyReceiver, deployer, creator } =
        await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id1 = generateAssetId(creator, 1);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id1,
        1,
        "0x"
      );

      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);

      // generate token id to be minted with creator already set
      const id2 = generateAssetId(deployer, 2);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id2,
        1,
        "0x01"
      );

      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);

      expect(splitter1).to.not.be.equal(splitter2);
    });

    it("should have same splitter address for tokens minted by same creator in batch mint", async function () {
      const { Asset, seller, royaltyReceiver, deployer, creator } =
        await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id1 = generateAssetId(creator, 1);

      // generate token id to be minted with creator already set
      const id2 = generateAssetId(creator, 2);

      await Asset.connect(await ethers.getSigner(deployer)).mintBatch(
        seller,
        [id1, id2],
        [1, 1],
        ["0x", "0x01"]
      );

      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);

      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);

      expect(splitter1).to.be.equal(splitter2);
    });

    it("should have different splitter address for tokens minted by same different creator in batch mint", async function () {
      const { Asset, seller, royaltyReceiver, deployer, creator } =
        await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id1 = generateAssetId(creator, 1);

      // generate token id to be minted with creator already set
      const id2 = generateAssetId(deployer, 2);

      await Asset.connect(await ethers.getSigner(deployer)).mintBatch(
        seller,
        [id1, id2],
        [1, 1],
        ["0x", "0x01"]
      );

      const splitter2 = await Asset._tokenRoyaltiesSplitter(id2);

      const splitter1 = await Asset._tokenRoyaltiesSplitter(id1);

      expect(splitter1).to.not.be.equal(splitter2);
    });

    it("should return splitter address on for a tokenId on royaltyInfo function call", async function () {
      const { Asset, seller, royaltyReceiver, deployer } =
        await royaltyDistribution();
      // generate token id to be minted with creator already set
      const id = generateAssetId(deployer, 2);
      // directly minting to the seller for marketplace transaction
      await Asset.connect(await ethers.getSigner(deployer)).mint(
        seller,
        id,
        1,
        "0x"
      );

      const splitter = await Asset._tokenRoyaltiesSplitter(id);

      const royaltyInfo = await Asset.royaltyInfo(id, 10000);

      expect(splitter).to.be.equal(royaltyInfo[0]);
    });
  });

  describe("Catalyst", () => {
    it("catalyst should return EIP2981 royalty recipient and royalty for other contracts(catalyst)", async function () {
      const { commonRoyaltyReceiver, catalyst, managerAsRoyaltySetter } =
        await royaltyDistribution();
      await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
      const id = 1;
      const priceToken = 300000;
      const royaltyInfo = await catalyst.royaltyInfo(id, priceToken);
      expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver);
      expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);
    });

    it("catalyst should same return EIP2981 royalty recipient for different tokens contracts(catalyst)", async function () {
      const { commonRoyaltyReceiver, catalyst, managerAsRoyaltySetter } =
        await royaltyDistribution();
      await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
      const id = 1;
      const id2 = 2;
      const priceToken = 300000;
      const royaltyInfo = await catalyst.royaltyInfo(id, priceToken);
      expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver);
      expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);

      const royaltyInfo2 = await catalyst.royaltyInfo(id2, priceToken);
      expect(royaltyInfo2[0]).to.be.equals(commonRoyaltyReceiver);
      expect(royaltyInfo2[1]).to.be.equals((500 * priceToken) / 10000);
    });
  });
});
