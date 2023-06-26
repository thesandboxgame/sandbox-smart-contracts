import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from "hardhat";
import { expect } from "chai";
import { splitterAbi } from "./Splitter.abi";
import { BigNumber } from "ethers";

function generateAssetId(creator: string, assetNumber: number) {
  const hex = assetNumber.toString(16);
  const hexLength = hex.length;
  let zeroAppends = "";
  const zeroAppendsLength = 24 - hexLength;
  for (let i = 0; i < zeroAppendsLength; i++) {
    zeroAppends = zeroAppends + "0";
  }
  return `0x${zeroAppends}${hex}${creator.slice(2)}`;
}

async function royaltyDistribution() {
  await deployments.fixture([
    "Asset",
    "RoyaltyEngineV1",
    "TestERC20",
    "MockMarketplace",
    "Catalyst",
    "Batch",
  ]);
  const {
    deployer,
    commonRoyaltyReceiver,
    assetAdmin,
    managerAdmin,
    contractRoyaltySetter,
  } = await getNamedAccounts();
  const { deploy } = await deployments;
  const users = await getUnnamedAccounts();

  const seller = users[0];
  const buyer = users[1];
  const royaltyReceiver = users[2];
  const user = users[3];
  const commonRoyaltyReceiver2 = users[4];
  const royaltyReceiver2 = users[5];
  const creator = users[6];

  await deploy("FallbackRegistry", {
    from: deployer,
    contract: "FallbackRegistry",
    args: [deployer],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  await deploy("RoyaltyRegistry", {
    from: deployer,
    contract: "RoyaltyRegistry",
    args: ["0x0000000000000000000000000000000000000000"],
    skipIfAlreadyDeployed: true,
    log: true,
  });
  const FallbackRegistry = await ethers.getContract("FallbackRegistry");

  await deploy("RoyaltyEngineV1", {
    from: deployer,
    contract: "RoyaltyEngineV1",
    args: [FallbackRegistry.address],
    skipIfAlreadyDeployed: true,
    log: true,
  });

  const RoyaltyRegistry = await ethers.getContract("RoyaltyRegistry");
  const RoyaltyEngineV1 = await ethers.getContract("RoyaltyEngineV1");
  await RoyaltyEngineV1.initialize(deployer, RoyaltyRegistry.address);

  await deploy("MockMarketplace", {
    from: deployer,
    contract: "MockMarketplace",
    skipIfAlreadyDeployed: true,
    args: [RoyaltyEngineV1.address],
    log: true,
  });

  await deploy("TestERC20", {
    from: deployer,
    contract: "TestERC20",
    skipIfAlreadyDeployed: true,
    args: ["TestERC20", "T"],
    log: true,
  });

  const ERC20 = await ethers.getContract("TestERC20");
  const manager = await ethers.getContract("Manager");
  const mockMarketplace = await ethers.getContract("MockMarketplace");
  const Asset = await ethers.getContract("Asset");

  const catalyst = await ethers.getContract("Catalyst");

  const assetAdminRole = await Asset.DEFAULT_ADMIN_ROLE();
  const assetMinterRole = await Asset.MINTER_ROLE();
  await Asset.connect(await ethers.provider.getSigner(assetAdmin)).grantRole(
    assetMinterRole,
    deployer
  );
  const managerAdminRole = await manager.DEFAULT_ADMIN_ROLE();
  const contractRoyaltySetterRole = await manager.CONTRACT_ROYALTY_SETTER_ROLE();
  const AssetAsSeller = Asset.connect(await ethers.getSigner(seller));
  const ERC20AsBuyer = ERC20.connect(await ethers.getSigner(buyer));
  const managerAsAdmin = manager.connect(await ethers.getSigner(managerAdmin));
  const managerAsRoyaltySetter = manager.connect(await ethers.getSigner(contractRoyaltySetter));


  return {
    Asset,
    ERC20,
    manager,
    mockMarketplace,
    AssetAsSeller,
    ERC20AsBuyer,
    deployer,
    seller,
    buyer,
    user,
    commonRoyaltyReceiver,
    royaltyReceiver,
    RoyaltyRegistry,
    managerAsAdmin,
    commonRoyaltyReceiver2,
    royaltyReceiver2,
    creator,
    assetAdminRole,
    catalyst,
    contractRoyaltySetter,
    assetAdmin,
    managerAdminRole,
    contractRoyaltySetterRole,
    managerAsRoyaltySetter
  };
}

describe("Asset and catalyst Royalties", () => {
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

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

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
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
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
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
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

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

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
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
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
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
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

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

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

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

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
    ).to.be.revertedWith(`AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${managerAdminRole}`);
  });

  it("Only manager admin can set common split", async function () {
    const { seller, manager, managerAdminRole } = await royaltyDistribution();
    await expect(
      manager
        .connect(await ethers.provider.getSigner(seller))
        .setSplit(3000)
    ).to.be.revertedWith(`AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${managerAdminRole}`);
  });

  it("manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)", async function () {
    const { managerAsRoyaltySetter, catalyst } = await royaltyDistribution();
    expect(await managerAsRoyaltySetter.contractRoyalty(catalyst.address)).to.be.equal(
      0
    );
    await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
    expect(await managerAsRoyaltySetter.contractRoyalty(catalyst.address)).to.be.equal(
      500
    );
  });

  it("only manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)", async function () {
    const { manager, seller, catalyst, contractRoyaltySetter } = await royaltyDistribution();
    await expect(
      manager
        .connect(await ethers.provider.getSigner(seller))
        .setContractRoyalty(catalyst.address, 500)
    ).to.be.revertedWith(`AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${contractRoyaltySetter}`);
  });

  // it("registry should return EIP2981 royalty recipient and royalty bps for other contracts(catalyst)", async function () {
  //   const { commonRoyaltyReceiver, catalyst, managerAsOwner } =
  //     await royaltyDistribution();
  //   await managerAsOwner.setContractRoyalty(catalyst.address, 500);
  //   const royaltyInfo = await catalyst.getRoyaltyInfo();
  //   expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver);
  //   expect(royaltyInfo[1]).to.be.equals(500);
  // });
});
