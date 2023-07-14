import {ethers} from 'hardhat';
import {expect} from 'chai';
import {splitterAbi} from './Splitter.abi.ts';
import {BigNumber} from 'ethers';
import {royaltyDistribution} from './fixture';

describe('Token', function () {
  it('should split ERC20 using EIP2981', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      ERC1155AsSeller,
      RoyaltyManagerContract,
    } = await royaltyDistribution();
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    await mockMarketplace.distributeRoyaltyEIP2981(
      1000000,
      ERC20.address,
      ERC1155.address,
      1,
      buyer.address,
      seller.address,
      true
    );
    const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
      deployer.address
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

    const balance = await ERC20.balanceOf(splitter);

    expect(balance).to.be.equal(1000000 * (_defaultRoyaltyBPS / 10000));

    await splitterContract
      .connect(await ethers.getSigner(royaltyReceiver.address))
      .splitERC20Tokens(ERC20.address);

    const balanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
    expect(balanceCommonRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
  });

  it('should split ERC20 using RoyaltyEngine', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      RoyaltyRegistry,
      ERC1155AsSeller,
    } = await royaltyDistribution();

    await RoyaltyRegistry.connect(deployer).setRoyaltyLookupAddress(
      ERC1155.address,
      ERC1155.address
    );
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    await mockMarketplace.distributeRoyaltyRoyaltyEngine(
      1000000,
      ERC20.address,
      ERC1155.address,
      1,
      buyer.address,
      seller.address,
      true
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const balanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );

    const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
    expect(balanceCommonRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
  });

  it('should split ETh using EIP2981', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      user,
      ERC1155AsSeller,
    } = await royaltyDistribution();
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    const balanceRoyaltyReceiver = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    const value = ethers.utils.parseUnits('1000', 'ether');
    await mockMarketplace
      .connect(await ethers.getSigner(user.address))
      .distributeRoyaltyEIP2981(
        0,
        ERC20.address,
        ERC1155.address,
        1,
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

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    expect(
      balanceRoyaltyReceiverNew
        .sub(balanceRoyaltyReceiver)
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
    );
  });

  it('should split ETh using RoyaltyEngine', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      user,
      ERC1155AsSeller,
    } = await royaltyDistribution();
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    await ERC1155.connect(seller).setApprovalForAll(
      mockMarketplace.address,
      true
    );
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    const balanceRoyaltyReceiver = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    const value = ethers.utils.parseUnits('1000', 'ether');
    await mockMarketplace
      .connect(await ethers.getSigner(user.address))
      .distributeRoyaltyRoyaltyEngine(
        0,
        ERC20.address,
        ERC1155.address,
        1,
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

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    expect(
      balanceRoyaltyReceiverNew
        .sub(balanceRoyaltyReceiver)
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
    );
  });

  it('creator should receive Royalty in Eth to new address set by the admin', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC1155AsSeller,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      royaltyReceiver2,
      user,
      RoyaltyManagerContract,
    } = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
      seller.address
    );

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

    expect(await splitterContract._recipient()).to.be.equal(
      royaltyReceiver.address
    );

    const tnx = await RoyaltyManagerContract.connect(
      seller
    ).setRoyaltyRecipient(royaltyReceiver2.address);

    await tnx.wait();

    expect(await splitterContract._recipient()).to.be.equal(
      royaltyReceiver2.address
    );

    const balanceRoyaltyReceiver2 = await ethers.provider.getBalance(
      royaltyReceiver2.address
    );
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );
    const value = ethers.utils.parseUnits('1000', 'ether');
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);

    await mockMarketplace
      .connect(await ethers.getSigner(user.address))
      .distributeRoyaltyRoyaltyEngine(
        0,
        ERC20.address,
        ERC1155.address,
        1,
        buyer.address,
        seller.address,
        true,
        {
          value: value,
        }
      );

    const balanceRoyaltyReceiver2New = await ethers.provider.getBalance(
      royaltyReceiver2.address
    );
    const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver2New.sub(balanceRoyaltyReceiver2)).to.be.equal(
      balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    expect(
      balanceRoyaltyReceiver2New
        .sub(balanceRoyaltyReceiver2)
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
    );
  });

  it('common recipient should receive Royalty in Eth to new address set by the admin on registry', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      commonRoyaltyReceiver2,
      RoyaltyManagerAsAdmin,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      user,
      ERC1155AsSeller,
    } = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
      commonRoyaltyReceiver.address
    );

    await RoyaltyManagerAsAdmin.setRecipient(commonRoyaltyReceiver2.address);

    expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
      commonRoyaltyReceiver2.address
    );

    const balanceRoyaltyReceiver = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver2 = await ethers.provider.getBalance(
      commonRoyaltyReceiver2.address
    );
    const value = ethers.utils.parseUnits('1000', 'ether');
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);

    await mockMarketplace
      .connect(user)
      .distributeRoyaltyRoyaltyEngine(
        0,
        ERC20.address,
        ERC1155.address,
        1,
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
    const balanceCommonRoyaltyReceiver2New = await ethers.provider.getBalance(
      commonRoyaltyReceiver2.address
    );

    expect(balanceRoyaltyReceiverNew.sub(balanceRoyaltyReceiver)).to.be.equal(
      balanceCommonRoyaltyReceiver2New.sub(balanceCommonRoyaltyReceiver2)
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    expect(
      balanceRoyaltyReceiverNew
        .sub(balanceRoyaltyReceiver)
        .add(
          balanceCommonRoyaltyReceiver2New.sub(balanceCommonRoyaltyReceiver2)
        )
    ).to.be.equal(
      value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
    );
  });

  it('common recipient should receive Royalty in Eth with new splits set by the admin on registry', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC1155AsSeller,
      RoyaltyManagerAsAdmin,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      user,
    } = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    await RoyaltyManagerAsAdmin.setSplit(6000);
    const balanceRoyaltyReceiver = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );
    const value = ethers.utils.parseUnits('1000', 'ether');
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);

    await mockMarketplace
      .connect(user)
      .distributeRoyaltyRoyaltyEngine(
        0,
        ERC20.address,
        ERC1155.address,
        1,
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

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const TotalRoyalty = value
      .mul(BigNumber.from(_defaultRoyaltyBPS))
      .div(BigNumber.from(10000));

    const sellerRoyaltyShare = TotalRoyalty.mul(BigNumber.from(4000)).div(
      BigNumber.from(10000)
    );

    const commonRecipientShare = TotalRoyalty.mul(BigNumber.from(6000)).div(
      BigNumber.from(10000)
    );

    expect(balanceRoyaltyReceiverNew.sub(balanceRoyaltyReceiver)).to.be.equal(
      sellerRoyaltyShare
    );

    expect(
      balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
    ).to.be.equal(commonRecipientShare);

    expect(
      balanceRoyaltyReceiverNew
        .sub(balanceRoyaltyReceiver)
        .add(balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
    );
  });

  it('creator should receive Royalty in ERC20 to new address royalty recipient address', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      ERC1155AsSeller,
      RoyaltyManagerContract,
      royaltyReceiver2,
    } = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
      seller.address
    );

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

    expect(await splitterContract._recipient()).to.be.equal(
      royaltyReceiver.address
    );

    const tnx = await RoyaltyManagerContract.connect(
      seller
    ).setRoyaltyRecipient(royaltyReceiver2.address);

    await tnx.wait();

    expect(await splitterContract._recipient()).to.be.equal(
      royaltyReceiver2.address
    );

    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    await mockMarketplace.distributeRoyaltyEIP2981(
      1000000,
      ERC20.address,
      ERC1155.address,
      1,
      buyer.address,
      seller.address,
      true
    );

    await splitterContract
      .connect(await ethers.getSigner(royaltyReceiver2.address))
      .splitERC20Tokens(ERC20.address);
    const balanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );
    expect(balanceRoyaltyReceiver).to.be.equal(0);

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    const balanceRoyaltyReceiver2 = await ERC20.balanceOf(
      royaltyReceiver2.address
    );

    expect(balanceRoyaltyReceiver2).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
    expect(balanceCommonRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
  });

  it('common recipient should receive Royalty in ERC20 to new address set by the admin on registry', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      seller,
      buyer,
      RoyaltyManagerAsAdmin,
      commonRoyaltyReceiver2,
      commonRoyaltyReceiver,
      royaltyReceiver,
      ERC1155AsSeller,
    } = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
      commonRoyaltyReceiver.address
    );

    await RoyaltyManagerAsAdmin.setRecipient(commonRoyaltyReceiver2.address);

    expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
      commonRoyaltyReceiver2.address
    );

    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);

    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    await mockMarketplace.distributeRoyaltyRoyaltyEngine(
      1000000,
      ERC20.address,
      ERC1155.address,
      1,
      buyer.address,
      seller.address,
      true
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const balanceCommonRoyaltyReceiver2 = await ERC20.balanceOf(
      commonRoyaltyReceiver2.address
    );

    const balanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
    expect(balanceCommonRoyaltyReceiver2).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
  });

  it('common recipient should receive Royalty in ERC20 with new splits set by the admin on registry', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      seller,
      buyer,
      RoyaltyManagerAsAdmin,
      ERC1155AsSeller,
      commonRoyaltyReceiver,
      royaltyReceiver,
    } = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    await RoyaltyManagerAsAdmin.setSplit(6000);

    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    await mockMarketplace.distributeRoyaltyRoyaltyEngine(
      1000000,
      ERC20.address,
      ERC1155.address,
      1,
      buyer.address,
      seller.address,
      true
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    const balanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver).to.be.equal(
      ((1000000 * (_defaultRoyaltyBPS / 10000)) / 5) * 2
    );
    expect(balanceCommonRoyaltyReceiver).to.be.equal(
      ((1000000 * (_defaultRoyaltyBPS / 10000)) / 5) * 3
    );
  });

  it('creator could change the recipient for his splitter', async function () {
    const {ERC1155, seller, royaltyReceiver, RoyaltyManagerContract} =
      await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
      seller.address
    );

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

    expect(await splitterContract._recipient()).to.be.equal(
      royaltyReceiver.address
    );

    const tnx = await RoyaltyManagerContract.connect(
      seller
    ).setRoyaltyRecipient(seller.address);

    await tnx.wait();

    expect(await splitterContract._recipient()).to.be.equal(seller.address);
  });

  it('only creator could change the recipient for his splitter', async function () {
    const {ERC1155, seller, royaltyReceiver, RoyaltyManagerContract} =
      await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    await expect(
      RoyaltyManagerContract.connect(royaltyReceiver).setRoyaltyRecipient(
        seller.address
      )
    ).to.revertedWith('Manager: No splitter deployed for the creator');
  });

  it('should have same splitter address for tokens with minted by same creator', async function () {
    const {ERC1155, seller, royaltyReceiver} = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter1 = await ERC1155._tokenRoyaltiesSplitter(1);

    await ERC1155.connect(seller).mint(
      seller.address,
      2,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter2 = await ERC1155._tokenRoyaltiesSplitter(2);

    expect(splitter1).to.be.equal(splitter2);
  });

  it('should not have same splitter address for tokens with minted by different creator', async function () {
    const {ERC1155, seller, buyer, royaltyReceiver} =
      await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter1 = await ERC1155._tokenRoyaltiesSplitter(1);

    await ERC1155.connect(buyer).mint(
      buyer.address,
      2,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter2 = await ERC1155._tokenRoyaltiesSplitter(2);

    expect(splitter1).to.not.be.equal(splitter2);
  });

  it('should return splitter address on for a tokenId on royaltyInfo function call', async function () {
    const {ERC1155, seller, royaltyReceiver} = await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter = await ERC1155._tokenRoyaltiesSplitter(1);

    const royaltyInfo = await ERC1155.royaltyInfo(1, 10000);

    expect(splitter).to.be.equal(royaltyInfo[0]);
  });

  it('Token admin can set default royalty Bps', async function () {
    const {ERC1155, deployer} = await royaltyDistribution();
    expect(await ERC1155._defaultRoyaltyBPS()).to.be.equal(300);
    await ERC1155.connect(deployer).setDefaultRoyaltyBps(400);
    expect(await ERC1155._defaultRoyaltyBPS()).to.be.equal(400);
  });

  it('Token admin can set default royalty address', async function () {
    const {ERC1155, royaltyReceiver, deployer} = await royaltyDistribution();
    expect(await ERC1155._defaultRoyaltyReceiver()).to.be.equal(
      royaltyReceiver.address
    );
    await ERC1155.connect(deployer).setDefaultRoyaltyReceiver(deployer.address);
    expect(await ERC1155._defaultRoyaltyReceiver()).to.be.equal(
      deployer.address
    );
  });

  it('only Token admin can set default royalty Bps', async function () {
    const {ERC1155, seller} = await royaltyDistribution();
    await expect(
      ERC1155.connect(seller).setDefaultRoyaltyBps(400)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('only Token admin can set default royalty address', async function () {
    const {ERC1155, seller} = await royaltyDistribution();
    await expect(
      ERC1155.connect(seller).setDefaultRoyaltyReceiver(seller.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('manager admin can set common royalty recipient', async function () {
    const {seller, commonRoyaltyReceiver, RoyaltyManagerAsAdmin} =
      await royaltyDistribution();
    expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
      commonRoyaltyReceiver.address
    );
    await RoyaltyManagerAsAdmin.setRecipient(seller.address);
    expect(await RoyaltyManagerAsAdmin.commonRecipient()).to.be.equal(
      seller.address
    );
  });

  it('manager admin can set common split', async function () {
    const {RoyaltyManagerAsAdmin} = await royaltyDistribution();
    expect(await RoyaltyManagerAsAdmin.commonSplit()).to.be.equal(5000);
    await RoyaltyManagerAsAdmin.setSplit(3000);
    expect(await RoyaltyManagerAsAdmin.commonSplit()).to.be.equal(3000);
  });

  it('only manager admin can set common royalty recipient', async function () {
    const {seller, RoyaltyManagerContract, managerAdminRole} =
      await royaltyDistribution();
    await expect(
      RoyaltyManagerContract.connect(seller).setRecipient(seller.address)
    ).to.be.revertedWith(
      `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${managerAdminRole}`
    );
  });

  it('only contract royalty setter can set common split', async function () {
    const {seller, RoyaltyManagerContract, managerAdminRole} =
      await royaltyDistribution();
    await expect(
      RoyaltyManagerContract.connect(seller).setSplit(3000)
    ).to.be.revertedWith(
      `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${managerAdminRole}`
    );
  });

  it('contract royalty setter set Eip 2981 royaltyBps for other contracts (SingleReceiver)', async function () {
    const {RoyaltyManagerAsRoyaltySetter, SingleReceiver} =
      await royaltyDistribution();
    expect(
      await RoyaltyManagerAsRoyaltySetter.contractRoyalty(
        SingleReceiver.address
      )
    ).to.be.equal(0);
    await RoyaltyManagerAsRoyaltySetter.setContractRoyalty(
      SingleReceiver.address,
      500
    );
    expect(
      await RoyaltyManagerAsRoyaltySetter.contractRoyalty(
        SingleReceiver.address
      )
    ).to.be.equal(500);
  });

  it('only contract royalty setter Eip 2981 royaltyBps for other contracts (SingleReceiver)', async function () {
    const {
      RoyaltyManagerContract,
      seller,
      SingleReceiver,
      contractRoyaltySetterRole,
    } = await royaltyDistribution();
    await expect(
      RoyaltyManagerContract.connect(seller).setContractRoyalty(
        SingleReceiver.address,
        500
      )
    ).to.be.revertedWith(
      `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${contractRoyaltySetterRole}`
    );
  });

  it('registry should return EIP2981 royalty recipient and royalty bps for other contracts(SingleReceiver)', async function () {
    const {
      commonRoyaltyReceiver,
      SingleReceiver,
      RoyaltyManagerAsRoyaltySetter,
    } = await royaltyDistribution();
    await RoyaltyManagerAsRoyaltySetter.setContractRoyalty(
      SingleReceiver.address,
      500
    );
    const royaltyInfo = await SingleReceiver.royaltyInfo(1, 3000000);
    expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver.address);
    expect(royaltyInfo[1]).to.be.equals((500 * 3000000) / 10000);
  });

  it('royalty receiver should be same for tokens with same creator on ERC1155 and ERC721 using EIP2981(ERC20)', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      ERC1155AsSeller,
      RoyaltyManagerContract,
      ERC721,
      ERC721AsSeller,
    } = await royaltyDistribution();
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    await mockMarketplace.distributeRoyaltyEIP2981(
      1000000,
      ERC20.address,
      ERC1155.address,
      1,
      buyer.address,
      seller.address,
      true
    );
    const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
      deployer.address
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const splitterContract = await ethers.getContractAt(splitterAbi, splitter);

    const balance = await ERC20.balanceOf(splitter);

    expect(balance).to.be.equal(1000000 * (_defaultRoyaltyBPS / 10000));

    await splitterContract
      .connect(royaltyReceiver)
      .splitERC20Tokens(ERC20.address);

    const balanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
    expect(balanceCommonRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
    await ERC721.connect(deployer).mint(
      seller.address,
      1,
      royaltyReceiver.address
    );
    await ERC20.mint(buyer.address, 1000000);

    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await ERC721AsSeller.setApprovalForAll(mockMarketplace.address, true);

    await mockMarketplace.distributeRoyaltyEIP2981(
      1000000,
      ERC20.address,
      ERC721.address,
      1,
      buyer.address,
      seller.address,
      false
    );
    const newBalance = await ERC20.balanceOf(splitter);

    expect(newBalance).to.be.equal(1000000 * (_defaultRoyaltyBPS / 10000));

    await splitterContract
      .connect(royaltyReceiver)
      .splitERC20Tokens(ERC20.address);

    const newBalanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );
    const newBalanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    expect(newBalanceRoyaltyReceiver).to.be.equal(
      1000000 * (_defaultRoyaltyBPS / 10000)
    );
    expect(newBalanceCommonRoyaltyReceiver).to.be.equal(
      1000000 * (_defaultRoyaltyBPS / 10000)
    );
  });

  it('royalty receiver should be same for tokens with same creator on ERC1155 and ERC721 using RoyaltyEngine(ERC20) ', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      RoyaltyRegistry,
      ERC1155AsSeller,
      ERC721,
      ERC721AsSeller,
    } = await royaltyDistribution();

    await RoyaltyRegistry.connect(deployer).setRoyaltyLookupAddress(
      ERC1155.address,
      ERC1155.address
    );
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    await mockMarketplace.distributeRoyaltyRoyaltyEngine(
      1000000,
      ERC20.address,
      ERC1155.address,
      1,
      buyer.address,
      seller.address,
      true
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    const balanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );

    const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );
    expect(balanceCommonRoyaltyReceiver).to.be.equal(
      (1000000 * (_defaultRoyaltyBPS / 10000)) / 2
    );

    await ERC721.connect(deployer).mint(
      seller.address,
      1,
      royaltyReceiver.address
    );
    await ERC20.mint(buyer.address, 1000000);

    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await ERC721AsSeller.setApprovalForAll(mockMarketplace.address, true);

    await mockMarketplace.distributeRoyaltyRoyaltyEngine(
      1000000,
      ERC20.address,
      ERC721.address,
      1,
      buyer.address,
      seller.address,
      false
    );

    const newBalanceRoyaltyReceiver = await ERC20.balanceOf(
      royaltyReceiver.address
    );
    const newBalanceCommonRoyaltyReceiver = await ERC20.balanceOf(
      commonRoyaltyReceiver.address
    );

    expect(newBalanceRoyaltyReceiver).to.be.equal(
      1000000 * (_defaultRoyaltyBPS / 10000)
    );
    expect(newBalanceCommonRoyaltyReceiver).to.be.equal(
      1000000 * (_defaultRoyaltyBPS / 10000)
    );
  });

  it('royalty receiver should be same for tokens with same creator on ERC1155 and ERC721 EIP2981(ETH)', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      user,
      ERC1155AsSeller,
      ERC721,
      ERC721AsSeller,
    } = await royaltyDistribution();
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    const balanceRoyaltyReceiver = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    const value = ethers.utils.parseUnits('1000', 'ether');
    await mockMarketplace
      .connect(user)
      .distributeRoyaltyEIP2981(
        0,
        ERC20.address,
        ERC1155.address,
        1,
        buyer.address,
        seller.address,
        true,
        {
          value: value,
        }
      );

    const balanceRoyaltyReceiver1 = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver1 = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver1.sub(balanceRoyaltyReceiver)).to.be.equal(
      balanceCommonRoyaltyReceiver1.sub(balanceCommonRoyaltyReceiver)
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    expect(
      balanceRoyaltyReceiver1
        .sub(balanceRoyaltyReceiver)
        .add(balanceCommonRoyaltyReceiver1.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
    );

    await ERC721.connect(deployer).mint(
      seller.address,
      1,
      royaltyReceiver.address
    );
    await ERC721AsSeller.setApprovalForAll(mockMarketplace.address, true);

    await mockMarketplace
      .connect(user)
      .distributeRoyaltyEIP2981(
        0,
        ERC20.address,
        ERC721.address,
        1,
        buyer.address,
        seller.address,
        false,
        {
          value: value,
        }
      );

    const balanceRoyaltyReceiver2 = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver2 = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver2.sub(balanceRoyaltyReceiver1)).to.be.equal(
      balanceCommonRoyaltyReceiver2.sub(balanceCommonRoyaltyReceiver1)
    );

    expect(
      balanceRoyaltyReceiver2
        .sub(balanceRoyaltyReceiver)
        .add(balanceCommonRoyaltyReceiver2.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value
        .mul(BigNumber.from(_defaultRoyaltyBPS))
        .div(BigNumber.from(10000))
        .mul(BigNumber.from(2))
    );
  });

  it('royalty receiver should be same for tokens with same creator on ERC1155 and ERC721 using RoyaltyEngine(ETH)', async function () {
    const {
      ERC1155,
      ERC20,
      mockMarketplace,
      deployer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      royaltyReceiver,
      user,
      ERC1155AsSeller,
      ERC721,
      ERC721AsSeller,
    } = await royaltyDistribution();
    await ERC1155.connect(deployer).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );
    await ERC1155.connect(seller).setApprovalForAll(
      mockMarketplace.address,
      true
    );
    expect(await ERC1155.balanceOf(seller.address, 1)).to.be.equals(1);
    const balanceRoyaltyReceiver = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );
    await ERC1155AsSeller.setApprovalForAll(mockMarketplace.address, true);
    const value = ethers.utils.parseUnits('1000', 'ether');
    await mockMarketplace
      .connect(user)
      .distributeRoyaltyRoyaltyEngine(
        0,
        ERC20.address,
        ERC1155.address,
        1,
        buyer.address,
        seller.address,
        true,
        {
          value: value,
        }
      );

    const balanceRoyaltyReceiver1 = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver1 = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver1.sub(balanceRoyaltyReceiver)).to.be.equal(
      balanceCommonRoyaltyReceiver1.sub(balanceCommonRoyaltyReceiver)
    );

    const _defaultRoyaltyBPS = await ERC1155._defaultRoyaltyBPS();

    expect(
      balanceRoyaltyReceiver1
        .sub(balanceRoyaltyReceiver)
        .add(balanceCommonRoyaltyReceiver1.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value.mul(BigNumber.from(_defaultRoyaltyBPS)).div(BigNumber.from(10000))
    );

    await ERC721.connect(deployer).mint(
      seller.address,
      1,
      royaltyReceiver.address
    );
    await ERC721AsSeller.setApprovalForAll(mockMarketplace.address, true);

    await mockMarketplace
      .connect(user)
      .distributeRoyaltyEIP2981(
        0,
        ERC20.address,
        ERC721.address,
        1,
        buyer.address,
        seller.address,
        false,
        {
          value: value,
        }
      );

    const balanceRoyaltyReceiver2 = await ethers.provider.getBalance(
      royaltyReceiver.address
    );
    const balanceCommonRoyaltyReceiver2 = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );

    expect(balanceRoyaltyReceiver2.sub(balanceRoyaltyReceiver1)).to.be.equal(
      balanceCommonRoyaltyReceiver2.sub(balanceCommonRoyaltyReceiver1)
    );

    expect(
      balanceRoyaltyReceiver2
        .sub(balanceRoyaltyReceiver)
        .add(balanceCommonRoyaltyReceiver2.sub(balanceCommonRoyaltyReceiver))
    ).to.be.equal(
      value
        .mul(BigNumber.from(_defaultRoyaltyBPS))
        .div(BigNumber.from(10000))
        .mul(BigNumber.from(2))
    );
  });

  it('should have same splitter address for tokens with minted by same creator on both ERC1155 and ERC721', async function () {
    const {ERC1155, seller, royaltyReceiver, ERC721} =
      await royaltyDistribution();
    await ERC1155.connect(seller).mint(
      seller.address,
      1,
      1,
      royaltyReceiver.address,
      '0x'
    );

    const splitter1 = await ERC1155._tokenRoyaltiesSplitter(1);

    await ERC721.connect(seller).mint(
      seller.address,
      2,
      royaltyReceiver.address
    );

    const splitter2 = await ERC721._tokenRoyaltiesSplitter(2);

    expect(splitter1).to.be.equal(splitter2);
  });
});
