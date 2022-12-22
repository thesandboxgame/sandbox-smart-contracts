import {ethers, getNamedAccounts, getUnnamedAccounts, deployments} from 'hardhat';
import {setupUsers, withSnapshot} from '../utils';
import {expect} from '../chai-setup';
import {zeroAddress} from '../land/fixtures';

const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

const setupOperatorFilter =  withSnapshot([] ,async function () {
    const {deployer, upgradeAdmin} = await getNamedAccounts();
    const {deploy} = deployments;

    await deploy('MockMarketPlace1', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy('MockMarketPlace2', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy('MockMarketPlace3', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy('MockMarketPlace4', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const MockMarketPlace1 = await ethers.getContract('MockMarketPlace1');
    const MockMarketPlace2 = await ethers.getContract('MockMarketPlace2');
    const MockMarketPlace3 = await ethers.getContract('MockMarketPlace3');
    const MockMarketPlace4 = await ethers.getContract('MockMarketPlace4');

    await deploy('MockOperatorFilterRegistry', {
      from: deployer,
      args: [defaultSubscription, [MockMarketPlace1.address, MockMarketPlace2.address]],
      log: true,
      skipIfAlreadyDeployed: true,
    });
    const OperatorFilterRegistry = await ethers.getContract(
      'MockOperatorFilterRegistry'
    );

    await deploy('ERC1155OperatorFilteredUpgradeable', {
      from: deployer,
      contract: 'ERC1155OperatorFilteredUpgradeable',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: '__ERC1155OperatorFiltered_init',
          args: ['testURI.com', OperatorFilterRegistry.address],
        },
        upgradeIndex: 0,
      },
      log: true,
    });

    await deploy('GenerateCodeHash', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const GenerateCodeHash = await ethers.getContract('GenerateCodeHash');

    const TestERC1155 = await ethers.getContract(
      'ERC1155OperatorFilteredUpgradeable'
    );

    const others = await getUnnamedAccounts();

    const users = await setupUsers(others, {TestERC1155, MockMarketPlace1});

    const OperatorFilterRegistryAsOwner = await OperatorFilterRegistry.connect(
      await ethers.getSigner(deployer)
    );
    const TestERC1155AsOwner = await TestERC1155.connect(
      await ethers.getSigner(deployer)
    );

    return {
      MockMarketPlace1,
      MockMarketPlace2,
      MockMarketPlace3,
      MockMarketPlace4,
      GenerateCodeHash,
      OperatorFilterRegistry,
      TestERC1155,
      TestERC1155AsOwner,
      OperatorFilterRegistryAsOwner,
      users,
    };
  });
describe('Operator filterer', function () {
  describe('TestERC1155', function () {
    it('should be registered ', async function () {
      const {OperatorFilterRegistry, TestERC1155} = await setupOperatorFilter();

      expect(
        await OperatorFilterRegistry.isRegistered(TestERC1155.address)
      ).to.be.equal(true);
    });

    it('should not have a subscription', async function () {
      const {OperatorFilterRegistry, TestERC1155} = await setupOperatorFilter();
      expect(
        await OperatorFilterRegistry.subscriptionOf(TestERC1155.address)
      ).to.be.equal(zeroAddress);
    });

    it('should have marketplaces blacklisted', async function () {
      const {
        MockMarketPlace1,
        MockMarketPlace2,
        MockMarketPlace3,
        MockMarketPlace4,
        OperatorFilterRegistry,
        TestERC1155,
        GenerateCodeHash,
      } = await setupOperatorFilter();

      const marketplace1Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace1.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace1.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace1Codehash
        )
      ).to.be.equal(true);

      const marketplace2Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace2.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace2.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace2Codehash
        )
      ).to.be.equal(true);

      const marketplace3Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace3.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace3.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace3Codehash
        )
      ).to.be.equal(false);

      const marketplace4Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace4.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace4.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace4Codehash
        )
      ).to.be.equal(false);
    });
    it('should have marketplaces black listed for default subscription', async function () {
      const {
        MockMarketPlace1,
        MockMarketPlace2,
        MockMarketPlace3,
        MockMarketPlace4,
        OperatorFilterRegistry,
        GenerateCodeHash,
      } = await setupOperatorFilter();

      const marketplace1Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace1.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          defaultSubscription,
          MockMarketPlace1.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          defaultSubscription,
          marketplace1Codehash
        )
      ).to.be.equal(true);

      const marketplace2Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace2.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          defaultSubscription,
          MockMarketPlace2.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          defaultSubscription,
          marketplace2Codehash
        )
      ).to.be.equal(true);

      const marketplace3Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace3.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          defaultSubscription,
          MockMarketPlace3.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          defaultSubscription,
          marketplace3Codehash
        )
      ).to.be.equal(false);

      const marketplace4Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace4.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          defaultSubscription,
          MockMarketPlace4.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          defaultSubscription,
          marketplace4Codehash
        )
      ).to.be.equal(false);
    });
  });
  describe('owner functions', function () {
    it('owner can unregister token contract', async function () {
      const {
        OperatorFilterRegistry,
        TestERC1155,
        OperatorFilterRegistryAsOwner,
      } = await setupOperatorFilter();

      await OperatorFilterRegistryAsOwner.unregister(TestERC1155.address);

      expect(
        await OperatorFilterRegistry.isRegistered(TestERC1155.address)
      ).to.be.equal(false);
    });

    it('owner can set the operator registry address', async function () {
      const {TestERC1155, TestERC1155AsOwner} = await setupOperatorFilter();

      await TestERC1155AsOwner.updateOperatorFilterRegistryAddress(
        TestERC1155.address
      );

      expect(await TestERC1155.operatorFilterRegistry()).to.be.equal(
        TestERC1155.address
      );
    });

    it('only owner can set the operator registry address', async function () {
      const {TestERC1155} = await setupOperatorFilter();

      await expect(
        TestERC1155.updateOperatorFilterRegistryAddress(TestERC1155.address)
      ).to.be.revertedWith('Only Owner');
    });

    it('owner can remove market places from Blacklist', async function () {
      const {
        MockMarketPlace1,
        OperatorFilterRegistry,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
      } = await setupOperatorFilter();

      const marketplace1Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace1.address
      );

      await OperatorFilterRegistryAsOwner.updateOperator(
        TestERC1155.address,
        MockMarketPlace1.address,
        false
      );

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace1.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace1Codehash
        )
      ).to.be.equal(true);

      await OperatorFilterRegistryAsOwner.updateCodeHash(
        TestERC1155.address,
        marketplace1Codehash,
        false
      );

      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace1Codehash
        )
      ).to.be.equal(false);
    });

    it('owner can remove market places from Blacklist in batch', async function () {
      const {
        MockMarketPlace1,
        MockMarketPlace2,
        OperatorFilterRegistry,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
      } = await setupOperatorFilter();

      const marketplace1Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace1.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace1.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace1Codehash
        )
      ).to.be.equal(true);

      const marketplace2Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace2.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace2.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace2Codehash
        )
      ).to.be.equal(true);

      await OperatorFilterRegistryAsOwner.updateOperators(
        TestERC1155.address,
        [MockMarketPlace1.address, MockMarketPlace2.address],
        false
      );

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace1.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace1Codehash
        )
      ).to.be.equal(true);

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace2.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace2Codehash
        )
      ).to.be.equal(true);

      await OperatorFilterRegistryAsOwner.updateCodeHashes(
        TestERC1155.address,
        [marketplace1Codehash, marketplace2Codehash],
        false
      );

      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace1Codehash
        )
      ).to.be.equal(false);

      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace2Codehash
        )
      ).to.be.equal(false);
    });

    it('owner can add market places to Blacklist', async function () {
      const {
        MockMarketPlace4,
        OperatorFilterRegistry,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
      } = await setupOperatorFilter();

      const marketplace4Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace4.address
      );

      await OperatorFilterRegistryAsOwner.updateOperator(
        TestERC1155.address,
        MockMarketPlace4.address,
        true
      );

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace4.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace4Codehash
        )
      ).to.be.equal(false);

      await OperatorFilterRegistryAsOwner.updateCodeHash(
        TestERC1155.address,
        marketplace4Codehash,
        true
      );

      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace4Codehash
        )
      ).to.be.equal(true);
    });

    it('owner can add market places to Blacklist in batch', async function () {
      const {
        MockMarketPlace4,
        MockMarketPlace3,
        OperatorFilterRegistry,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
      } = await setupOperatorFilter();

      const marketplace3Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace3.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace3.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace3Codehash
        )
      ).to.be.equal(false);

      const marketplace4Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace4.address
      );
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace4.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace4Codehash
        )
      ).to.be.equal(false);

      await OperatorFilterRegistryAsOwner.updateOperators(
        TestERC1155.address,
        [MockMarketPlace4.address, MockMarketPlace3.address],
        true
      );

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace4.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace4Codehash
        )
      ).to.be.equal(false);

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          TestERC1155.address,
          MockMarketPlace3.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace3Codehash
        )
      ).to.be.equal(false);

      await OperatorFilterRegistryAsOwner.updateCodeHashes(
        TestERC1155.address,
        [marketplace4Codehash, marketplace3Codehash],
        true
      );

      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace4Codehash
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace3Codehash
        )
      ).to.be.equal(true);
    });
  });

  describe('Operator filterer', function () {
    it('should not approve blacklisted marketplaces', async function () {
      const {MockMarketPlace1, TestERC1155} = await setupOperatorFilter();

      await expect(
        TestERC1155.setApprovalForAll(MockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('should not transfer through black listed Marketplaces', async function () {
      const {
        MockMarketPlace1,
        TestERC1155,
        users,
      } = await setupOperatorFilter();

      await TestERC1155.mint(users[0].address, 1, 2, '0x');

      await users[0].TestERC1155.setApprovalForAllWithOutFilter(
        MockMarketPlace1.address,
        true
      );

      await expect(
        MockMarketPlace1.transferToken(
          TestERC1155.address,
          users[0].address,
          users[1].address,
          1,
          2,
          '0x'
        )
      ).to.be.reverted;
    });

    it('should approve non black listed Marketplaces', async function () {
      const {
        MockMarketPlace4,
        TestERC1155,
        users,
      } = await setupOperatorFilter();

      await users[0].TestERC1155.setApprovalForAll(
        MockMarketPlace4.address,
        true
      );

      expect(
        await TestERC1155.isApprovedForAll(
          users[0].address,
          MockMarketPlace4.address
        )
      ).to.be.equals(true);
    });

    it('should transfer through non black listed Marketplaces', async function () {
      const {
        MockMarketPlace4,
        TestERC1155,
        users,
      } = await setupOperatorFilter();

      await TestERC1155.mint(users[0].address, 1, 2, '0x');

      await users[0].TestERC1155.setApprovalForAllWithOutFilter(
        MockMarketPlace4.address,
        true
      );

      await MockMarketPlace4.transferToken(
        TestERC1155.address,
        users[0].address,
        users[1].address,
        1,
        2,
        '0x'
      );

      expect(await TestERC1155.balanceOf(users[1].address, 1)).to.be.equals(2);
    });

    it("should be able to approve after Marketplace's Address and CodeHash is removed from blacklist ", async function () {
      const {
        MockMarketPlace1,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
        users,
      } = await setupOperatorFilter();

      const marketplace1Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace1.address
      );

      await expect(
        users[0].TestERC1155.setApprovalForAll(MockMarketPlace1.address, true)
      ).to.be.reverted;

      await OperatorFilterRegistryAsOwner.updateCodeHash(
        TestERC1155.address,
        marketplace1Codehash,
        false
      );

      await expect(
        users[0].TestERC1155.setApprovalForAll(MockMarketPlace1.address, true)
      ).to.be.reverted;

      await OperatorFilterRegistryAsOwner.updateOperator(
        TestERC1155.address,
        MockMarketPlace1.address,
        false
      );

      await users[0].TestERC1155.setApprovalForAll(
        MockMarketPlace1.address,
        true
      );

      expect(
        await TestERC1155.isApprovedForAll(
          users[0].address,
          MockMarketPlace1.address
        )
      ).to.be.equals(true);
    });

    it("should  be able to transfer after marketplace's Address and Codehash after it is removed from blacklist", async function () {
      const {
        MockMarketPlace1,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
        users,
      } = await setupOperatorFilter();

      await TestERC1155.mint(users[0].address, 1, 2, '0x');

      const marketplace1Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace1.address
      );

      await users[0].TestERC1155.setApprovalForAllWithOutFilter(
        MockMarketPlace1.address,
        true
      );

      await expect(
        MockMarketPlace1.transferToken(
          TestERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.reverted;

      await OperatorFilterRegistryAsOwner.updateCodeHash(
        TestERC1155.address,
        marketplace1Codehash,
        false
      );

      await expect(
        MockMarketPlace1.transferToken(
          TestERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.reverted;

      await OperatorFilterRegistryAsOwner.updateOperator(
        TestERC1155.address,
        MockMarketPlace1.address,
        false
      );

      await MockMarketPlace1.transferToken(
        TestERC1155.address,
        users[0].address,
        users[1].address,
        1,
        2,
        '0x'
      );

      expect(await TestERC1155.balanceOf(users[1].address, 1)).to.be.equals(2);
    });

    it("should not be able to approve after Marketplace's Codehash is blacklisted", async function () {
      const {
        MockMarketPlace4,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
        users,
      } = await setupOperatorFilter();

      const marketplace4Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace4.address
      );

      await users[0].TestERC1155.setApprovalForAll(
        MockMarketPlace4.address,
        true
      );
      expect(
        await TestERC1155.isApprovedForAll(
          users[0].address,
          MockMarketPlace4.address
        )
      ).to.be.equals(true);

      await OperatorFilterRegistryAsOwner.updateCodeHash(
        TestERC1155.address,
        marketplace4Codehash,
        true
      );

      await expect(
        users[1].TestERC1155.setApprovalForAll(MockMarketPlace4.address, true)
      ).to.be.reverted;
    });

    it("should not be able to approve after Marketplace's address is blacklisted", async function () {
      const {
        MockMarketPlace4,
        TestERC1155,
        OperatorFilterRegistryAsOwner,
        users,
      } = await setupOperatorFilter();

      await users[0].TestERC1155.setApprovalForAll(
        MockMarketPlace4.address,
        true
      );
      expect(
        await TestERC1155.isApprovedForAll(
          users[0].address,
          MockMarketPlace4.address
        )
      ).to.be.equals(true);

      await OperatorFilterRegistryAsOwner.updateOperator(
        TestERC1155.address,
        MockMarketPlace4.address,
        true
      );

      await expect(
        users[1].TestERC1155.setApprovalForAll(MockMarketPlace4.address, true)
      ).to.be.reverted;
    });

    it("should not be able to transfer after marketplace's Codehash is blacklisted", async function () {
      const {
        MockMarketPlace4,
        TestERC1155,
        GenerateCodeHash,
        OperatorFilterRegistryAsOwner,
        users,
      } = await setupOperatorFilter();

      await TestERC1155.mint(users[0].address, 1, 2, '0x');

      const marketplace4Codehash = await GenerateCodeHash.getCodeHash(
        MockMarketPlace4.address
      );

      await users[0].TestERC1155.setApprovalForAll(
        MockMarketPlace4.address,
        true
      );

      await MockMarketPlace4.transferToken(
        TestERC1155.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(await TestERC1155.balanceOf(users[1].address, 1)).to.be.equals(1);

      await OperatorFilterRegistryAsOwner.updateCodeHash(
        TestERC1155.address,
        marketplace4Codehash,
        true
      );

      await expect(
        MockMarketPlace4.transferToken(
          TestERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.reverted;
    });

    it("should not be able to transfer after marketplace's address is blacklisted", async function () {
      const {
        MockMarketPlace4,
        TestERC1155,
        OperatorFilterRegistryAsOwner,
        users,
      } = await setupOperatorFilter();

      await TestERC1155.mint(users[0].address, 1, 2, '0x');

      await users[0].TestERC1155.setApprovalForAll(
        MockMarketPlace4.address,
        true
      );

      await MockMarketPlace4.transferToken(
        TestERC1155.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(await TestERC1155.balanceOf(users[1].address, 1)).to.be.equals(1);

      await OperatorFilterRegistryAsOwner.updateOperator(
        TestERC1155.address,
        MockMarketPlace4.address,
        true
      );

      await expect(
        MockMarketPlace4.transferToken(
          TestERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.reverted;
    });

    it('should be able to approve after blacklisted Marketplaces operator registry is set to zero Address', async function () {
      const {
        MockMarketPlace1,
        TestERC1155,
        TestERC1155AsOwner,
        users,
      } = await setupOperatorFilter();

      await expect(
        users[0].TestERC1155.setApprovalForAll(MockMarketPlace1.address, true)
      ).to.be.reverted;

      await TestERC1155AsOwner.updateOperatorFilterRegistryAddress(zeroAddress);

      await users[0].TestERC1155.setApprovalForAll(
        MockMarketPlace1.address,
        true
      );

      expect(
        await TestERC1155.isApprovedForAll(
          users[0].address,
          MockMarketPlace1.address
        )
      ).to.be.equals(true);
    });

    it('should  be able to transfer Token through blacklisted marketplace after operator registry is set to zero address', async function () {
      const {
        MockMarketPlace1,
        TestERC1155,
        TestERC1155AsOwner,
        users,
      } = await setupOperatorFilter();

      await TestERC1155.mint(users[0].address, 1, 2, '0x');

      await users[0].TestERC1155.setApprovalForAllWithOutFilter(
        MockMarketPlace1.address,
        true
      );

      await expect(
        MockMarketPlace1.transferToken(
          TestERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.reverted;

      await TestERC1155AsOwner.updateOperatorFilterRegistryAddress(zeroAddress);

      await MockMarketPlace1.transferToken(
        TestERC1155.address,
        users[0].address,
        users[1].address,
        1,
        2,
        '0x'
      );

      expect(await TestERC1155.balanceOf(users[1].address, 1)).to.be.equals(2);
    });
  });
});
