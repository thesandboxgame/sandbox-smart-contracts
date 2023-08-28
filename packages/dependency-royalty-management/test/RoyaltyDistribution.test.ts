import {ethers} from 'hardhat';
import {expect} from 'chai';
import {splitterAbi} from './Splitter.abi';
import {royaltyDistribution} from './fixture';
import {BigNumber} from 'ethers';
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe('Royalty', function () {
  describe('Royalty distribution through splitter', function () {
    it('should emit TrustedForwarderSet event with correct data when setting new trusted forwarder', async function () {
      const {
        deployer,
        RoyaltyManagerContract,
        RoyaltyManagerAsAdmin,
        TrustedForwarder,
      } = await royaltyDistribution();
      expect(
        await await RoyaltyManagerContract.getTrustedForwarder()
      ).to.be.equal(TrustedForwarder.address);
      await expect(RoyaltyManagerAsAdmin.setTrustedForwarder(deployer.address))
        .to.emit(RoyaltyManagerContract, 'TrustedForwarderSet')
        .withArgs(TrustedForwarder.address, deployer.address);
    });

    it('should emit SplitterDeployed event with correct data when deploying splitter', async function () {
      const {
        seller,
        royaltyReceiver,
        RoyaltyManagerContract,
        RoyaltyManagerAsAdmin,
        splitterDeployerRole,
      } = await royaltyDistribution();

      expect(
        await RoyaltyManagerContract._creatorRoyaltiesSplitter(seller.address)
      ).to.be.equals('0x0000000000000000000000000000000000000000');
      await RoyaltyManagerAsAdmin.grantRole(
        splitterDeployerRole,
        seller.address
      );

      const splitterDeployedTx = await RoyaltyManagerContract.connect(
        seller
      ).deploySplitter(seller.address, royaltyReceiver.address);

      await expect(splitterDeployedTx)
        .to.emit(RoyaltyManagerContract, 'SplitterDeployed')
        .withArgs(
          seller.address,
          royaltyReceiver.address,
          await RoyaltyManagerContract._creatorRoyaltiesSplitter(seller.address)
        );
    });

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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      const balance = await ERC20.balanceOf(splitter);

      expect(balance).to.be.equal(1000000 * (erc1155Royalty / 10000));

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
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
    });

    it('should split ERC20 using EIP2981 using trusted forwarder', async function () {
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
        TrustedForwarder,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      const balance = await ERC20.balanceOf(splitter);

      expect(balance).to.be.equal(1000000 * (erc1155Royalty / 10000));
      const data = await splitterContract
        .connect(royaltyReceiver.address)
        .populateTransaction['splitERC20Tokens(address)'](ERC20.address);

      await TrustedForwarder.execute({...data, value: BigNumber.from(0)});

      const balanceRoyaltyReceiver = await ERC20.balanceOf(
        royaltyReceiver.address
      );
      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      expect(balanceRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const balanceRoyaltyReceiver = await ERC20.balanceOf(
        royaltyReceiver.address
      );

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      expect(balanceRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      expect(
        balanceRoyaltyReceiverNew
          .sub(balanceRoyaltyReceiver)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value
          .mul(ethers.BigNumber.from(erc1155Royalty))
          .div(ethers.BigNumber.from(10000))
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      expect(
        balanceRoyaltyReceiverNew
          .sub(balanceRoyaltyReceiver)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value
          .mul(ethers.BigNumber.from(erc1155Royalty))
          .div(ethers.BigNumber.from(10000))
      );
    });

    it('should receive Royalty in Eth to new address set by the creator', async function () {
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

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

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

      expect(
        balanceRoyaltyReceiver2New.sub(balanceRoyaltyReceiver2)
      ).to.be.equal(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      );

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      expect(
        balanceRoyaltyReceiver2New
          .sub(balanceRoyaltyReceiver2)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value
          .mul(ethers.BigNumber.from(erc1155Royalty))
          .div(ethers.BigNumber.from(10000))
      );
    });

    it('should receive Royalty in Eth to new common recipient address set by the admin on registry', async function () {
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      expect(
        balanceRoyaltyReceiverNew
          .sub(balanceRoyaltyReceiver)
          .add(
            balanceCommonRoyaltyReceiver2New.sub(balanceCommonRoyaltyReceiver2)
          )
      ).to.be.equal(
        value
          .mul(ethers.BigNumber.from(erc1155Royalty))
          .div(ethers.BigNumber.from(10000))
      );
    });

    it('should receive Royalty in Eth with new splits set by the admin on registry', async function () {
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const TotalRoyalty = value
        .mul(ethers.BigNumber.from(erc1155Royalty))
        .div(ethers.BigNumber.from(10000));

      const sellerRoyaltyShare = TotalRoyalty.mul(
        ethers.BigNumber.from(4000)
      ).div(ethers.BigNumber.from(10000));

      const commonRecipientShare = TotalRoyalty.mul(
        ethers.BigNumber.from(6000)
      ).div(ethers.BigNumber.from(10000));

      expect(balanceRoyaltyReceiverNew.sub(balanceRoyaltyReceiver)).to.be.equal(
        sellerRoyaltyShare
      );

      expect(
        balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
      ).to.be.equal(commonRecipientShare);

      expect(
        balanceRoyaltyReceiverNew
          .sub(balanceRoyaltyReceiver)
          .add(
            balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
          )
      ).to.be.equal(
        value
          .mul(ethers.BigNumber.from(erc1155Royalty))
          .div(ethers.BigNumber.from(10000))
      );
    });

    it('should receive Royalty(creator) in ERC20 to new address royalty recipient address', async function () {
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

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      const balanceRoyaltyReceiver2 = await ERC20.balanceOf(
        royaltyReceiver2.address
      );

      expect(balanceRoyaltyReceiver2).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
    });

    it('should receive Royalty(common recipient) in ERC20 to new address set by the admin on registry', async function () {
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const balanceCommonRoyaltyReceiver2 = await ERC20.balanceOf(
        commonRoyaltyReceiver2.address
      );

      const balanceRoyaltyReceiver = await ERC20.balanceOf(
        royaltyReceiver.address
      );

      expect(balanceRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver2).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
    });

    it('should receive Royalty in ERC20 with new splits set by the admin on registry', async function () {
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      const balanceRoyaltyReceiver = await ERC20.balanceOf(
        royaltyReceiver.address
      );

      expect(balanceRoyaltyReceiver).to.be.equal(
        ((1000000 * (erc1155Royalty / 10000)) / 5) * 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        ((1000000 * (erc1155Royalty / 10000)) / 5) * 3
      );
    });

    it('should split ETH when splitETH method is called', async function () {
      const {
        RoyaltyManagerContract,
        seller,
        ERC1155,
        deployer,
        royaltyReceiver,
      } = await royaltyDistribution();

      await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );

      const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
        deployer.address
      );
      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );
      const royaltyReceiverBalanceWithoutValue =
        await ethers.provider.getBalance(royaltyReceiver.address);
      const value = ethers.utils.parseUnits('1', 'ether');

      const royaltyReceiverBalanceWithoutValueNew =
        await ethers.provider.getBalance(royaltyReceiver.address);
      expect(
        royaltyReceiverBalanceWithoutValueNew.sub(
          royaltyReceiverBalanceWithoutValue
        )
      ).to.be.equal(0);
      const royaltyReceiverBalance = await ethers.provider.getBalance(
        royaltyReceiver.address
      );
      await splitterContract.splitETH({value: value});
      const royaltyReceiverBalanceNew = await ethers.provider.getBalance(
        royaltyReceiver.address
      );

      expect(royaltyReceiverBalanceNew.sub(royaltyReceiverBalance)).to.be.equal(
        value.div(2)
      );
    });
  });

  describe('Access control', function () {
    it('only recipients can split ERC20 tokens', async function () {
      const {
        ERC1155,
        ERC20,
        mockMarketplace,
        ERC20AsBuyer,
        deployer,
        seller,
        buyer,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      const balance = await ERC20.balanceOf(splitter);

      expect(balance).to.be.equal(1000000 * (erc1155Royalty / 10000));

      await expect(
        splitterContract.splitERC20Tokens(ERC20.address)
      ).to.be.revertedWith(
        'Split: Can only be called by one of the recipients'
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

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

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

    it('manager admin can set trusted forwarder', async function () {
      const {RoyaltyManagerAsAdmin, TrustedForwarder, seller} =
        await royaltyDistribution();
      expect(await RoyaltyManagerAsAdmin.getTrustedForwarder()).to.be.equal(
        TrustedForwarder.address
      );
      await RoyaltyManagerAsAdmin.setTrustedForwarder(seller.address);
      expect(await RoyaltyManagerAsAdmin.getTrustedForwarder()).to.be.equal(
        seller.address
      );
    });

    it('only manager admin can set trusted forwarder', async function () {
      const {RoyaltyManagerContract, seller, managerAdminRole} =
        await royaltyDistribution();
      await expect(
        RoyaltyManagerContract.connect(seller).setTrustedForwarder(
          seller.address
        )
      ).to.be.revertedWith(
        `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${managerAdminRole}`
      );
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

    it('contract royalty setter set Eip 2981 royaltyBps for other contracts', async function () {
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
    });

    it('only contract royalty setter set Eip 2981 royaltyBps for other contracts', async function () {
      const {RoyaltyManagerContract, seller, SingleReceiver} =
        await royaltyDistribution();

      await expect(
        RoyaltyManagerContract.connect(seller).setContractRoyalty(
          SingleReceiver.address,
          500
        )
      ).to.be.revertedWith(
        `AccessControl: account ${seller.address.toLowerCase()} is missing role ${await RoyaltyManagerContract.CONTRACT_ROYALTY_SETTER_ROLE()}`
      );
    });
    it('should be reverted when caller do not have splitter deployer role', async function () {
      const {
        RoyaltyManagerContract,
        seller,
        royaltyReceiver,
        splitterDeployerRole,
      } = await royaltyDistribution();
      await expect(
        RoyaltyManagerContract.connect(seller).deploySplitter(
          seller.address,
          royaltyReceiver.address
        )
      ).to.be.revertedWith(
        `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${splitterDeployerRole}`
      );
    });
    it('should not be reverted when caller have splitter deployer role', async function () {
      const {
        RoyaltyManagerContract,
        seller,
        royaltyReceiver,
        splitterDeployerRole,
        RoyaltyManagerAsAdmin,
      } = await royaltyDistribution();
      await RoyaltyManagerAsAdmin.grantRole(
        splitterDeployerRole,
        seller.address
      );
      expect(
        await RoyaltyManagerContract._creatorRoyaltiesSplitter(seller.address)
      ).to.be.equals('0x0000000000000000000000000000000000000000');

      await RoyaltyManagerContract.connect(seller).deploySplitter(
        seller.address,
        royaltyReceiver.address
      );

      expect(
        await RoyaltyManagerContract._creatorRoyaltiesSplitter(seller.address)
      ).to.not.equals('0x0000000000000000000000000000000000000000');
    });
  });

  describe('Multi contract splitter setup', function () {
    it('should have same splitter address for tokens with minted by same creator', async function () {
      const {ERC1155, seller, royaltyReceiver} = await royaltyDistribution();
      await ERC1155.connect(seller).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );

      const splitter1 = await ERC1155.getTokenRoyaltiesSplitter(1);

      await ERC1155.connect(seller).mint(
        seller.address,
        2,
        1,
        royaltyReceiver.address,
        '0x'
      );

      const splitter2 = await ERC1155.getTokenRoyaltiesSplitter(2);

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

      const splitter1 = await ERC1155.getTokenRoyaltiesSplitter(1);

      await ERC1155.connect(buyer).mint(
        buyer.address,
        2,
        1,
        royaltyReceiver.address,
        '0x'
      );

      const splitter2 = await ERC1155.getTokenRoyaltiesSplitter(2);

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

      const splitter = await ERC1155.getTokenRoyaltiesSplitter(1);

      const royaltyInfo = await ERC1155.royaltyInfo(1, 10000);

      expect(splitter).to.be.equal(royaltyInfo[0]);
    });
    it('should return EIP2981 royalty recipient and royalty bps for other contracts from registry(SingleReceiver)', async function () {
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

    it('should have same royalty receiver(splitter) for tokens with same creator on ERC1155 and ERC721 using EIP2981(ERC20)', async function () {
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      const balance = await ERC20.balanceOf(splitter);

      expect(balance).to.be.equal(1000000 * (erc1155Royalty / 10000));

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
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
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

      const erc721Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC721.address
      );

      expect(newBalance).to.be.equal(1000000 * (erc1155Royalty / 10000));

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
        1000000 * (erc721Royalty / 10000)
      );
      expect(newBalanceCommonRoyaltyReceiver).to.be.equal(
        1000000 * (erc721Royalty / 10000)
      );
    });

    it('should have same royalty receivers(common recipient and creator) for tokens with same creator on ERC1155 and ERC721 using RoyaltyEngine(ERC20) ', async function () {
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      const balanceRoyaltyReceiver = await ERC20.balanceOf(
        royaltyReceiver.address
      );

      const balanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      expect(balanceRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
      );
      expect(balanceCommonRoyaltyReceiver).to.be.equal(
        (1000000 * (erc1155Royalty / 10000)) / 2
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
      const erc721Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC721.address
      );

      const newBalanceRoyaltyReceiver = await ERC20.balanceOf(
        royaltyReceiver.address
      );
      const newBalanceCommonRoyaltyReceiver = await ERC20.balanceOf(
        commonRoyaltyReceiver.address
      );

      expect(newBalanceRoyaltyReceiver).to.be.equal(
        1000000 * (erc721Royalty / 10000)
      );
      expect(newBalanceCommonRoyaltyReceiver).to.be.equal(
        1000000 * (erc721Royalty / 10000)
      );
    });

    it('should have same royalty receivers(common recipient and creator) for tokens with same creator on ERC1155 and ERC721 EIP2981(ETH)', async function () {
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      expect(
        balanceRoyaltyReceiver1
          .sub(balanceRoyaltyReceiver)
          .add(balanceCommonRoyaltyReceiver1.sub(balanceCommonRoyaltyReceiver))
      ).to.be.equal(
        value
          .mul(ethers.BigNumber.from(erc1155Royalty))
          .div(ethers.BigNumber.from(10000))
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
      const erc721Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC721.address
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
          .mul(ethers.BigNumber.from(erc721Royalty))
          .div(ethers.BigNumber.from(10000))
          .mul(ethers.BigNumber.from(2))
      );
    });

    it('should have same royalty receivers(common recipient and creator)  for tokens with same creator on ERC1155 and ERC721 using RoyaltyEngine(ETH)', async function () {
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
        RoyaltyManagerContract,
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

      const erc1155Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC1155.address
      );

      expect(
        balanceRoyaltyReceiver1
          .sub(balanceRoyaltyReceiver)
          .add(balanceCommonRoyaltyReceiver1.sub(balanceCommonRoyaltyReceiver))
      ).to.be.equal(
        value
          .mul(ethers.BigNumber.from(erc1155Royalty))
          .div(ethers.BigNumber.from(10000))
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

      const erc721Royalty = await RoyaltyManagerContract.getContractRoyalty(
        ERC721.address
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
          .mul(ethers.BigNumber.from(erc721Royalty))
          .div(ethers.BigNumber.from(10000))
          .mul(ethers.BigNumber.from(2))
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

      const splitter1 = await ERC1155.getTokenRoyaltiesSplitter(1);

      await ERC721.connect(seller).mint(
        seller.address,
        2,
        royaltyReceiver.address
      );

      const splitter2 = await ERC721.getTokenRoyaltiesSplitter(2);

      expect(splitter1).to.be.equal(splitter2);
    });

    it('should return creator royalty splitter from Royalty manager', async function () {
      const {
        RoyaltyManagerContract,
        seller,
        ERC1155,
        deployer,
        royaltyReceiver,
      } = await royaltyDistribution();
      await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );

      expect(
        await RoyaltyManagerContract.getCreatorRoyaltySplitter(deployer.address)
      ).to.be.equal(await ERC1155.getTokenRoyaltiesSplitter(1));
    });
    it('should emit Token Royalty Splitter set event when a token is minted for first time', async function () {
      const {seller, ERC1155, deployer, royaltyReceiver} =
        await royaltyDistribution();

      const mintTx = await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const mintResult = await mintTx.wait();
<<<<<<< HEAD

=======
>>>>>>> a4a8444b (feat : added test cases)
      const splitterSetEvent = mintResult.events[4];
      expect(splitterSetEvent.event).to.equal('TokenRoyaltySplitterSet');
    });
    it('should not emit Token Royalty Splitter set event when a token is minted for second time', async function () {
      const {seller, ERC1155, deployer, royaltyReceiver} =
        await royaltyDistribution();
      const mintTx = await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const mintResult = await mintTx.wait();
<<<<<<< HEAD

=======
>>>>>>> a4a8444b (feat : added test cases)
      const splitterSetEvent = mintResult.events[4];
      expect(splitterSetEvent.event).to.equal('TokenRoyaltySplitterSet');
      const mintTx2 = await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const mintResult2 = await mintTx2.wait();
      for (let i = 0; i < mintResult2.events.length; i++) {
        expect(mintResult.events[i].event).to.not.equal(
          'TokenRoyaltySplitterSet'
        );
      }
    });
    it('should emit recipient set event when a token minted for the first time', async function () {
      const {seller, ERC1155, deployer, royaltyReceiver} =
        await royaltyDistribution();
      const mintTx = await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const mintResult = await mintTx.wait();
      const log = mintResult.logs[1];
      expect(log.topics[0]).to.be.equal(
        ethers.utils.id('RecipientSet(address)')
      );
    });
    it('should not emit recipient set event when token is minted for second time', async function () {
      const {seller, ERC1155, deployer, royaltyReceiver} =
        await royaltyDistribution();
      const mintTx = await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const mintResult = await mintTx.wait();
      const log = mintResult.logs[1];
      expect(log.topics[0]).to.be.equal(
        ethers.utils.id('RecipientSet(address)')
      );

      const mintTx2 = await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const mintResult2 = await mintTx2.wait();
      for (let i = 0; i < mintResult2.events.length; i++) {
        expect(mintResult.logs[i].topics[0]).to.not.equal(
          ethers.utils.id('RecipientSet(address)')
        );
      }
    });
  });

  describe('Input validation', function () {
    it('should revert setting royalty recipient when no splitter is deployed', async function () {
      const {RoyaltyManagerContract, seller} = await royaltyDistribution();
      await expect(
        RoyaltyManagerContract.connect(seller).setRoyaltyRecipient(
          seller.address
        )
      ).to.be.revertedWith('Manager: No splitter deployed for the creator');
    });
    it('should revert setting royalty recipient when recipient is set again', async function () {
      const {RoyaltyManagerContract, seller, ERC1155, royaltyReceiver} =
        await royaltyDistribution();
      await ERC1155.connect(seller).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      await expect(
        RoyaltyManagerContract.connect(seller).setRoyaltyRecipient(
          royaltyReceiver.address
        )
      ).to.be.revertedWith('Manager: Recipient already set');
    });
    it('should revert if when contract royalties is greater than total basis points', async function () {
      const {
        RoyaltyManagerContract,
        SingleReceiver,
        RoyaltyManagerAsRoyaltySetter,
      } = await royaltyDistribution();

      await expect(
        RoyaltyManagerAsRoyaltySetter.setContractRoyalty(
          SingleReceiver.address,
          10001
        )
      ).to.be.revertedWith(
        "Manager: Royalty can't be greater than Total base points"
      );
      await expect(
        RoyaltyManagerAsRoyaltySetter.setContractRoyalty(
          SingleReceiver.address,
          500
        )
      )
        .to.emit(RoyaltyManagerContract, 'RoyaltySet')
        .withArgs(500, SingleReceiver.address);
    });
    it('should revert when setRecipients in splitter called by not owner', async function () {
      const {
        RoyaltyManagerContract,
        deployer,
        user,
        ERC20,
        ERC1155,
        seller,
        royaltyReceiver,
        buyer,
        ERC20AsBuyer,
        mockMarketplace,
        ERC1155AsSeller,
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
      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      await expect(
        splitterContract.connect(user).setRecipients([])
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should revert when split called by non-recipients', async function () {
      const {
        RoyaltyManagerContract,
        seller,
        buyer,
        ERC1155,
        ERC20AsBuyer,
        mockMarketplace,
        ERC1155AsSeller,
        deployer,
        user,
        ERC20,
        royaltyReceiver,
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

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      await expect(
        splitterContract.connect(user).splitERC20Tokens(ERC20.address)
      ).to.be.revertedWith(
        'Split: Can only be called by one of the recipients'
      );
    });
    it('should revert when zero balance of split tokens', async function () {
      const {
        RoyaltyManagerContract,
        seller,
        buyer,
        ERC1155,
        ERC20AsBuyer,
        mockMarketplace,
        ERC1155AsSeller,
        deployer,
        ERC20,
        royaltyReceiver,
        RoyaltyManagerAsRoyaltySetter,
      } = await royaltyDistribution();
      await RoyaltyManagerAsRoyaltySetter.setContractRoyalty(
        ERC1155.address,
        0
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

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      await expect(
        splitterContract
          .connect(royaltyReceiver)
          .splitERC20Tokens(ERC20.address)
      ).to.be.revertedWith('Split: ERC20 split failed');
    });

    it('should revert when recipient is set for a creator with no splitter', async function () {
      const {RoyaltyManagerContract, deployer} = await royaltyDistribution();

      await expect(
        RoyaltyManagerContract.connect(deployer).setRoyaltyRecipient(
          zeroAddress
        )
      ).to.be.revertedWith('Manager: No splitter deployed for the creator');
    });

    it('should revert on for overflow for try mul in splitter contract', async function () {
      const {
        ERC1155,
        deployer,
        seller,
        royaltyReceiver,
        RoyaltyManagerContract,
      } = await royaltyDistribution();
      await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const TestERC20Factory = await ethers.getContractFactory(
        'OverflowTestERC20'
      );
      const OverflowERC20 = await TestERC20Factory.deploy();

      const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
        deployer.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );

      await OverflowERC20.mintMax(splitter);
      await expect(
        splitterContract
          .connect(royaltyReceiver)
          .splitERC20Tokens(OverflowERC20.address)
      ).to.be.revertedWith('RoyaltySplitter: Multiplication Overflow');
    });
  });

  describe('Interfaces', function () {
    it('should support interface for Royalty Splitter', async function () {
      const {
        RoyaltyManagerContract,
        deployer,
        ERC1155,
        seller,
        royaltyReceiver,
      } = await royaltyDistribution();
      await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const splitter = await RoyaltyManagerContract._creatorRoyaltiesSplitter(
        deployer.address
      );

      const splitterContract = await ethers.getContractAt(
        splitterAbi,
        splitter
      );
      expect(await splitterContract.supportsInterface(0x16cf0c05)).to.be.equal(
        true
      );
    });
    it('should support interface for royalty distributer', async function () {
      const royaltyDistributerFactory = await ethers.getContractFactory(
        'RoyaltyDistributor'
      );
      const royaltyDistributer = await royaltyDistributerFactory.deploy();
      expect(
        await royaltyDistributer.supportsInterface(0x2a55205a)
      ).to.be.equal(true);
    });

    it('should support interface for multiRoyalty distributer', async function () {
      const {ERC1155} = await royaltyDistribution();
      expect(await ERC1155.supportsInterface(0x2a55205a)).to.be.equal(true);
    });
  });

  describe('Single receiver for contracts which have single royalty recipient (common recipient)', function () {
    it('Should return contract royalty from manager for single receiver', async function () {
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
  });

  describe('Royalty recipients', function () {
    it('should return splitter address in royalty info', async function () {
      const {ERC1155, royaltyReceiver, deployer, seller} =
        await royaltyDistribution();
      await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );

      expect(await ERC1155.royaltyInfo(1, 0)).to.deep.equal([
        await ERC1155.getTokenRoyaltiesSplitter(1),
        0,
      ]);
    });
    it('should return common royalty recipient address in when no splitter is set for a token', async function () {
      const {ERC1155, commonRoyaltyReceiver} = await royaltyDistribution();

      expect(await ERC1155.royaltyInfo(1, 0)).to.deep.equal([
        commonRoyaltyReceiver.address,
        0,
      ]);
    });
    it('should return zero address and zero bps when set for token which have no splitter deployed', async function () {
      const {ERC1155, RoyaltyManagerAsRoyaltySetter} =
        await royaltyDistribution();

      await RoyaltyManagerAsRoyaltySetter.setContractRoyalty(
        ERC1155.address,
        0
      );
      expect(await ERC1155.royaltyInfo(2, 1000)).to.deep.equal(['0', 0x00]);
    });
    it('should return all the royalty recipient form the contract', async function () {
      const {ERC1155, commonRoyaltyReceiver, seller, user, deployer} =
        await royaltyDistribution();
      await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        user.address,
        '0x'
      );
      expect(await ERC1155.getAllSplits()).to.deep.equal([
        commonRoyaltyReceiver.address,
        await ERC1155.getTokenRoyaltiesSplitter(1),
      ]);
    });
    it('should return all the royalty recipient of a token', async function () {
      const {
        ERC1155,
        royaltyReceiver,
        deployer,
        seller,
        commonRoyaltyReceiver,
      } = await royaltyDistribution();

      expect((await ERC1155.getRecipients(1))[0].recipient).to.be.equal(
        commonRoyaltyReceiver.address
      );
      await ERC1155.connect(deployer).mint(
        seller.address,
        1,
        1,
        royaltyReceiver.address,
        '0x'
      );
      const recipients = await ERC1155.getRecipients(1);
      expect(recipients[0].recipient).to.deep.equal(royaltyReceiver.address);
      expect(recipients[1].recipient).to.deep.equal(
        commonRoyaltyReceiver.address
      );
    });
  });
});
