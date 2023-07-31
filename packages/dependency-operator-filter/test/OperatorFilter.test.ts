import {expect} from 'chai';
import {ethers} from 'hardhat';
import {setupOperatorFilter} from './fixtures/testFixture';
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe('OperatorFilterer', function () {
  describe('common contract subscription setup', function () {
    it('should be registered', async function () {
      const {operatorFilterRegistry, ERC1155} = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isRegistered(ERC1155.address)
      ).to.be.equal(true);
    });

    it('should not be registered on operator filter registry if not set on the token', async function () {
      const {operatorFilterRegistry, UnRegisteredToken} =
        await setupOperatorFilter();
      await UnRegisteredToken.registerAndSubscribe(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(UnRegisteredToken.address)
      ).to.be.equal(false);
    });

    it('should not be registered if registry is not deployed', async function () {
      const {operatorFilterRegistry} = await setupOperatorFilter();

      const OperatorFilterSubscriptionFactory = await ethers.getContractFactory(
        'OperatorFilterSubscription'
      );

      const operatorFilterSubscription =
        await OperatorFilterSubscriptionFactory.deploy();
      expect(
        await operatorFilterRegistry.isRegistered(
          operatorFilterSubscription.address
        )
      ).to.be.equal(false);
    });

    it('should not subscribe to operatorFilterSubscription if token is already registered', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        UnRegisteredToken,
      } = await setupOperatorFilter();
      await UnRegisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnRegisteredToken.registerAndSubscribe(zeroAddress, false);
      await UnRegisteredToken.registerAndSubscribe(
        operatorFilterSubscription.address,
        true
      );

      expect(
        await operatorFilterRegistry.subscriptionOf(UnRegisteredToken.address)
      ).to.be.equal(zeroAddress);
    });

    it('should not subscribe to operatorFilterSubscription if  is already registered', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        UnRegisteredToken,
      } = await setupOperatorFilter();
      await UnRegisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnRegisteredToken.registerAndSubscribe(
        operatorFilterSubscription.address,
        true
      );

      expect(
        await operatorFilterRegistry.subscriptionOf(UnRegisteredToken.address)
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('should be registered through when zero address subscription is passed', async function () {
      const {operatorFilterRegistry, UnRegisteredToken} =
        await setupOperatorFilter();

      await UnRegisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnRegisteredToken.registerAndSubscribe(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(UnRegisteredToken.address)
      ).to.be.equal(true);
    });

    it('should be registered and copy subscription', async function () {
      const {
        operatorFilterRegistry,
        UnRegisteredToken,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await UnRegisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnRegisteredToken.registerAndSubscribe(
        operatorFilterSubscription.address,
        false
      );

      expect(
        await operatorFilterRegistry.isRegistered(UnRegisteredToken.address)
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.subscriptionOf(UnRegisteredToken.address)
      ).to.be.equal(zeroAddress);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          UnRegisteredToken.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('should be subscribed to common subscription', async function () {
      const {operatorFilterRegistry, ERC1155, filterOperatorSubscription} =
        await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(ERC1155.address)
      ).to.be.equal(filterOperatorSubscription.address);
    });

    it('default subscription should blacklist Mock Market places 1, 2 and not 3, 4', async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        mockMarketPlace2,
        mockMarketPlace3,
        mockMarketPlace4,
        DEFAULT_SUBSCRIPTION,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace4CodeHash
        )
      ).to.be.equal(false);
    });

    it('common subscription should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        mockMarketPlace2,
        mockMarketPlace3,
        mockMarketPlace4,
        filterOperatorSubscription,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace4CodeHash
        )
      ).to.be.equal(false);
    });

    it('ERC1155 should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        mockMarketPlace2,
        mockMarketPlace3,
        mockMarketPlace4,
        ERC1155,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace4CodeHash
        )
      ).to.be.equal(false);
    });

    it("removing market places from common subscription's blacklist should reflect on ERC1155's blacklist", async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
        ERC1155,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        MockERC1155MarketPlace1CodeHash,
        false
      );

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(false);
    });

    it("adding market places to common subscription's blacklist should reflect on ERC1155's blacklist", async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace3,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
        ERC1155,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);
      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        MockERC1155MarketPlace3CodeHash,
        true
      );

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC1155.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC1155.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          filterOperatorSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          filterOperatorSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(true);
    });
  });
  describe('common signer subscription setup', function () {
    it('should be registered', async function () {
      const {operatorFilterRegistry, ERC721} = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isRegistered(ERC721.address)
      ).to.be.equal(true);
    });

    it('should be subscribed to common subscription', async function () {
      const {operatorFilterRegistry, ERC721, operatorFilterSubscription} =
        await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(ERC721.address)
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('default subscription should blacklist Mock Market places 1, 2 and not 3, 4', async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        mockMarketPlace2,
        mockMarketPlace3,
        mockMarketPlace4,
        DEFAULT_SUBSCRIPTION,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          DEFAULT_SUBSCRIPTION,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          DEFAULT_SUBSCRIPTION,
          MockERC1155MarketPlace4CodeHash
        )
      ).to.be.equal(false);
    });

    it('common subscription should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        mockMarketPlace2,
        mockMarketPlace3,
        mockMarketPlace4,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace4CodeHash
        )
      ).to.be.equal(false);
    });

    it('ERC721 should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        mockMarketPlace2,
        mockMarketPlace3,
        mockMarketPlace4,
        ERC721,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace4CodeHash
        )
      ).to.be.equal(false);
    });

    it("removing market places from common subscription's blacklist should reflect on ERC721's blacklist", async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        ERC721,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        MockERC1155MarketPlace1CodeHash,
        false
      );

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(false);
    });

    it("adding market places to common subscription's blacklist should reflect on ERC721's blacklist", async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        ERC721,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);
      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        MockERC1155MarketPlace3CodeHash,
        true
      );

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          ERC721.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          ERC721.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          operatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(true);
    });
  });
  describe('transfer and approval ', function () {
    it('black listed market places can be approved if operator filterer registry is not set on token', async function () {
      const {
        UnRegisteredToken,
        users,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await UnRegisteredToken.registerAndSubscribe(
        operatorFilterSubscription.address,
        true
      );

      await users[0].UnRegisteredToken.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await UnRegisteredToken.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('black listed market places can transfer token if operator filterer registry is not set on token', async function () {
      const {
        UnRegisteredToken,
        users,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await UnRegisteredToken.mintWithoutMinterRole(users[0].address, 1, 1);

      await UnRegisteredToken.registerAndSubscribe(
        operatorFilterSubscription.address,
        true
      );

      await users[0].UnRegisteredToken.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await UnRegisteredToken.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      await mockMarketPlace1.transferTokenForERC1155(
        UnRegisteredToken.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(
        await UnRegisteredToken.balanceOf(users[1].address, 1)
      ).to.be.equal(1);
    });
    it('should be able to safe transfer if from is the owner of token', async function () {
      const {ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);

      await users[0].ERC1155.safeTransferFrom(
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);
    });

    it('should be able to safe batch transfer if from is the owner of token', async function () {
      const {ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);
      await ERC1155.mintWithoutMinterRole(users[0].address, 2, 1);

      await users[0].ERC1155.safeBatchTransferFrom(
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);
      expect(await ERC1155.balanceOf(users[1].address, 2)).to.be.equal(1);
    });

    it('should be able to safe transfer if from is the owner of and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);

      await users[0].ERC1155.safeTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        1,
        1,
        '0x'
      );

      expect(await ERC1155.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(
        1
      );
    });

    it('should be able to safe batch transfer if from is the owner of  and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);
      await ERC1155.mintWithoutMinterRole(users[0].address, 2, 1);

      await users[0].ERC1155.safeBatchTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        [1, 2],
        [1, 1],
        '0x'
      );

      expect(await ERC1155.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(
        1
      );
      expect(await ERC1155.balanceOf(mockMarketPlace1.address, 2)).to.be.equal(
        1
      );
    });

    it('it should not setApprovalForAll blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();
      await expect(
        users[0].ERC1155.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('it should setApprovalForAll non blacklisted market places', async function () {
      const {mockMarketPlace3, ERC1155, users} = await setupOperatorFilter();
      await users[0].ERC1155.setApprovalForAll(mockMarketPlace3.address, true);
      expect(
        await ERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
        ERC1155,
        users,
      } = await setupOperatorFilter();
      await users[0].ERC1155.setApprovalForAll(mockMarketPlace3.address, true);

      expect(
        await ERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].ERC1155.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWithCustomError;
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
        ERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsSubscription.codeHashOf(
          mockMarketPlace3.address
        );

      await users[0].ERC1155.setApprovalForAll(mockMarketPlace3.address, true);

      expect(
        await ERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].ERC1155.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWith;
    });

    it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
        ERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsSubscription.codeHashOf(
          mockMarketPlace1.address
        );

      await expect(
        users[0].ERC1155.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.revertedWithCustomError;

      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].ERC1155.setApprovalForAll(mockMarketPlace1.address, true);

      expect(
        await ERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {mockMarketPlace1, ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.transferTokenForERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.revertedWithCustomError;
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        ERC1155,
        users,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
      } = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 2);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.transferTokenForERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenForERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.revertedWithCustomError;
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {mockMarketPlace3, ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.transferTokenForERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
      const {
        mockMarketPlace3,
        ERC1155,
        users,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
      } = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 2);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.transferTokenForERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsSubscription.codeHashOf(
          mockMarketPlace3.address
        );
      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenForERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.revertedWithCustomError;
    });

    it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        ERC1155,
        users,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsSubscription.codeHashOf(
          mockMarketPlace1.address
        );
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace1.address,
        true
      );

      await expect(
        mockMarketPlace1.transferTokenForERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        )
      ).to.be.revertedWithCustomError;

      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace1.address,
        false
      );
      await mockMarketPlace1.transferTokenForERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);
    });

    it('it should not be able to batch transfer through blacklisted market places', async function () {
      const {mockMarketPlace1, ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);
      await ERC1155.mintWithoutMinterRole(users[0].address, 2, 1);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.batchTransferTokenERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        )
      ).to.be.revertedWithCustomError;
    });

    it('it should not be able to batch transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        ERC1155,
        users,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
      } = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 2);
      await ERC1155.mintWithoutMinterRole(users[0].address, 2, 2);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);

      expect(await ERC1155.balanceOf(users[1].address, 2)).to.be.equal(1);

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.batchTransferTokenERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        )
      ).to.be.revertedWithCustomError;
    });

    it('it should be able to batch transfer through non blacklisted market places', async function () {
      const {mockMarketPlace3, ERC1155, users} = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);
      await ERC1155.mintWithoutMinterRole(users[0].address, 2, 1);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.batchTransferTokenERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);
      expect(await ERC1155.balanceOf(users[1].address, 2)).to.be.equal(1);
    });

    it('it should not be able to batch transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
      const {
        mockMarketPlace3,
        ERC1155,
        users,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
      } = await setupOperatorFilter();
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 2);
      await ERC1155.mintWithoutMinterRole(users[0].address, 2, 2);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.batchTransferTokenERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);
      expect(await ERC1155.balanceOf(users[1].address, 2)).to.be.equal(1);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsSubscription.codeHashOf(
          mockMarketPlace3.address
        );
      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        mockMarketPlace3.batchTransferTokenERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        )
      ).to.be.revertedWithCustomError;
    });

    it('it should be able to batch transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        ERC1155,
        users,
        operatorFilterRegistryAsSubscription,
        filterOperatorSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsSubscription.codeHashOf(
          mockMarketPlace1.address
        );
      await ERC1155.mintWithoutMinterRole(users[0].address, 1, 1);
      await ERC1155.mintWithoutMinterRole(users[0].address, 2, 1);

      await users[0].ERC1155.setApprovalForAllWithoutFilter(
        mockMarketPlace1.address,
        true
      );

      await expect(
        mockMarketPlace1.batchTransferTokenERC1155(
          ERC1155.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        )
      ).to.be.revertedWithCustomError;

      await operatorFilterRegistryAsSubscription.updateCodeHash(
        filterOperatorSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsSubscription.updateOperator(
        filterOperatorSubscription.address,
        mockMarketPlace1.address,
        false
      );
      await mockMarketPlace1.batchTransferTokenERC1155(
        ERC1155.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        '0x'
      );

      expect(await ERC1155.balanceOf(users[1].address, 1)).to.be.equal(1);
      expect(await ERC1155.balanceOf(users[1].address, 2)).to.be.equal(1);
    });
  });
});
