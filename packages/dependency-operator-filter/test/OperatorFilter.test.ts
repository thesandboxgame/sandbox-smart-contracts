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
      const {operatorFilterRegistry, UnregisteredToken} =
        await setupOperatorFilter();
      await UnregisteredToken.registerAndSubscribe(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(UnregisteredToken.address)
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
        basicOperatorFilterSubscription,
        UnregisteredToken,
      } = await setupOperatorFilter();
      await UnregisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnregisteredToken.registerAndSubscribe(zeroAddress, false);
      await UnregisteredToken.registerAndSubscribe(
        basicOperatorFilterSubscription.address,
        true
      );

      expect(
        await operatorFilterRegistry.subscriptionOf(UnregisteredToken.address)
      ).to.be.equal(zeroAddress);
    });

    it('should not subscribe to operatorFilterSubscription if  is already registered', async function () {
      const {
        operatorFilterRegistry,
        basicOperatorFilterSubscription,
        UnregisteredToken,
      } = await setupOperatorFilter();
      await UnregisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnregisteredToken.registerAndSubscribe(
        basicOperatorFilterSubscription.address,
        true
      );

      expect(
        await operatorFilterRegistry.subscriptionOf(UnregisteredToken.address)
      ).to.be.equal(basicOperatorFilterSubscription.address);
    });

    it('should be registered through when zero address subscription is passed', async function () {
      const {operatorFilterRegistry, UnregisteredToken} =
        await setupOperatorFilter();

      await UnregisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnregisteredToken.registerAndSubscribe(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(UnregisteredToken.address)
      ).to.be.equal(true);
    });

    it('should be registered and copy subscription', async function () {
      const {
        operatorFilterRegistry,
        UnregisteredToken,
        basicOperatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await UnregisteredToken.setRegistry(operatorFilterRegistry.address);
      await UnregisteredToken.registerAndSubscribe(
        basicOperatorFilterSubscription.address,
        false
      );

      expect(
        await operatorFilterRegistry.isRegistered(UnregisteredToken.address)
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.subscriptionOf(UnregisteredToken.address)
      ).to.be.equal(zeroAddress);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          UnregisteredToken.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('should be subscribed to common subscription', async function () {
      const {operatorFilterRegistry, ERC1155, assetOperatorFilterSubscription} =
        await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(ERC1155.address)
      ).to.be.equal(assetOperatorFilterSubscription.address);
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
        basicOperatorFilterSubscription,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          basicOperatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          basicOperatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          basicOperatorFilterSubscription.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          basicOperatorFilterSubscription.address,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          basicOperatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          basicOperatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          basicOperatorFilterSubscription.address,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          basicOperatorFilterSubscription.address,
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
        assetOperatorFilterSubscription,
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
          assetOperatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
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
          assetOperatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(false);
    });

    it("adding market places to common subscription's blacklist should reflect on ERC1155's blacklist", async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace3,
        assetOperatorFilterSubscription,
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
          assetOperatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
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
          assetOperatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
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
      const {
        operatorFilterRegistry,
        ERC721,
        catalystOperatorFilterSubscription,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(ERC721.address)
      ).to.be.equal(catalystOperatorFilterSubscription.address);
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
        assetOperatorFilterSubscription,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
      const MockERC1155MarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          assetOperatorFilterSubscription.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      const MockERC1155MarketPlace2CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace2CodeHash
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          assetOperatorFilterSubscription.address,
          mockMarketPlace4.address
        )
      ).to.be.equal(false);

      const MockERC1155MarketPlace4CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          assetOperatorFilterSubscription.address,
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
        catalystOperatorFilterSubscription,
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
          catalystOperatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          catalystOperatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(true);

      await operatorFilterRegistry.updateOperator(
        catalystOperatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await operatorFilterRegistry.updateCodeHash(
        catalystOperatorFilterSubscription.address,
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
          catalystOperatorFilterSubscription.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          catalystOperatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash
        )
      ).to.be.equal(false);
    });

    it("adding market places to common subscription's blacklist should reflect on ERC721's blacklist", async function () {
      const {
        operatorFilterRegistry,
        mockMarketPlace3,
        catalystOperatorFilterSubscription,
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
          catalystOperatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(false);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          catalystOperatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(false);

      await operatorFilterRegistry.updateOperator(
        catalystOperatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await operatorFilterRegistry.updateCodeHash(
        catalystOperatorFilterSubscription.address,
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
          catalystOperatorFilterSubscription.address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          catalystOperatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash
        )
      ).to.be.equal(true);
    });
  });

  describe('transfer and approval ', function () {
    it('should be able to approve black listed market places if operator filterer registry is not set on token', async function () {
      const {
        UnregisteredToken,
        users,
        basicOperatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await UnregisteredToken.registerAndSubscribe(
        basicOperatorFilterSubscription.address,
        true
      );

      await users[0].UnregisteredToken.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await UnregisteredToken.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('should be able to transfer through black listed market places if operator filterer registry is not set on token', async function () {
      const {
        UnregisteredToken,
        users,
        basicOperatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await UnregisteredToken.mintWithoutMinterRole(users[0].address, 1, 1);

      await UnregisteredToken.registerAndSubscribe(
        basicOperatorFilterSubscription.address,
        true
      );

      await users[0].UnregisteredToken.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await UnregisteredToken.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      await mockMarketPlace1.transferTokenForERC1155(
        UnregisteredToken.address,
        users[0].address,
        users[1].address,
        1,
        1,
        '0x'
      );

      expect(
        await UnregisteredToken.balanceOf(users[1].address, 1)
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
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
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

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].ERC1155.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.reverted;
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
        ERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].ERC1155.setApprovalForAll(mockMarketPlace3.address, true);

      expect(
        await ERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].ERC1155.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.reverted;
    });

    it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
        ERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].ERC1155.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.reverted;

      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
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
      ).to.be.reverted;
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        ERC1155,
        users,
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
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

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
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
      ).to.be.reverted;
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
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
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

      const mockMarketPlace3CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace3.address
      );
      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
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
      ).to.be.reverted;
    });

    it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        ERC1155,
        users,
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistry.codeHashOf(
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
      ).to.be.reverted;

      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
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
      ).to.be.reverted;
    });

    it('it should not be able to batch transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        ERC1155,
        users,
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
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

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
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
      ).to.be.reverted;
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
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
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

      const mockMarketPlace3CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace3.address
      );
      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
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
      ).to.be.reverted;
    });

    it('it should be able to batch transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        ERC1155,
        users,
        operatorFilterRegistry,
        assetOperatorFilterSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistry.codeHashOf(
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
      ).to.be.reverted;

      await operatorFilterRegistry.updateCodeHash(
        assetOperatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistry.updateOperator(
        assetOperatorFilterSubscription.address,
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
