import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {setupUsers, withSnapshot} from '../utils';
import {expect} from '../chai-setup';
import {zeroAddress} from '../land/fixtures';

const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

const setupOperatorFilter = withSnapshot(
  [
    'ERC1155OperatorFilteredUpgradeable',
    'MockMarketPlace4',
    'GenerateCodeHash',
  ],
  async function () {
    const MockMarketPlace1 = await ethers.getContract('MockMarketPlace1');
    const MockMarketPlace2 = await ethers.getContract('MockMarketPlace2');
    const MockMarketPlace3 = await ethers.getContract('MockMarketPlace3');
    const MockMarketPlace4 = await ethers.getContract('MockMarketPlace4');
    const GenerateCodeHash = await ethers.getContract('GenerateCodeHash');

    const OperatorFilterRegistry = await ethers.getContract(
      'OperatorFilterRegistry'
    );
    const TestERC1155 = await ethers.getContract(
      'ERC1155OperatorFilteredUpgradeable'
    );

    const {deployer} = await getNamedAccounts();

    const others = await getUnnamedAccounts();

    const users = await setupUsers(others, {TestERC1155, MockMarketPlace1});

    const OperatorFilterRegistryAsOwner = await OperatorFilterRegistry.connect(
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
      OperatorFilterRegistryAsOwner,
      users,
    };
  }
);
describe('Operator filterer', function () {
  describe('TestERC1155', function () {
    it('Should be registered ', async function () {
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
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          TestERC1155.address,
          marketplace3Codehash
        )
      ).to.be.equal(true);

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
          MockMarketPlace2.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistry.isCodeHashFiltered(
          defaultSubscription,
          marketplace3Codehash
        )
      ).to.be.equal(true);

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
  });

  describe('Operator filterer', function () {
    it('Should not approve blacklisted marketplaces', async function () {
      const {MockMarketPlace1, TestERC1155} = await setupOperatorFilter();

      await expect(
        TestERC1155.setApprovalForAll(MockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('Should not transfer through black listed Marketplaces', async function () {
      const {MockMarketPlace1, TestERC1155, users} =
        await setupOperatorFilter();

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

    it('Should approve non black listed Marketplaces', async function () {
      const {MockMarketPlace4, TestERC1155, users} =
        await setupOperatorFilter();

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

    it('Should transfer through non black listed Marketplaces', async function () {
      const {MockMarketPlace4, TestERC1155, users} =
        await setupOperatorFilter();

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

    it('Should not be able to approve after Marketplaces is blacklisted', async function () {
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

    it('Should be able to approve after Marketplaces is removed from blacklist', async function () {
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

    it('Should not be able to transfer Token through marketplace after is blacklisted', async function () {
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

    it('Should  be able to transfer Token through marketplace after it is removed from blacklist', async function () {
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
  });
});
