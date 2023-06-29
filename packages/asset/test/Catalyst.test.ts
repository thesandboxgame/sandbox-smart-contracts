import { expect } from "chai";
import { setupOperatorFilter } from "./fixtures/operatorFIlterFixture";

describe("Catalyst", () => {
  describe("OperatorFilterer", function () {
    describe("common subscription setup", function () {
      it("should be registered", async function () {
        const { operatorFilterRegistry, Catalyst } =
          await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isRegistered(Catalyst.address)
        ).to.be.equal(true);
      });

      it("should be subscribed to common subscription", async function () {
        const { operatorFilterRegistry, Catalyst, operatorFilterSubscription } =
          await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.subscriptionOf(Catalyst.address)
        ).to.be.equal(operatorFilterSubscription.address);
      });

      it("default subscription should blacklist Mock Market places 1, 2 and not 3, 4", async function () {
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

      it("common subscription should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription", async function () {
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

      it("Catalyst should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          Catalyst,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it("removing market places from common subscription's blacklist should reflect on Catalyst's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
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

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash,
          false
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
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

      it("adding market places to common subscription's blacklist should reflect on Catalyst's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace3,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);
        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
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

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash,
          true
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
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

    describe("Catalyst transfer and approval ", function () {
      it("should be able to safe transfer Catalyst if from is the owner of token", async function () {
        const { Catalyst, users } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.safeTransferFrom(
          users[0].address,
          users[1].address,
          1,
          1,
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it("should be able to safe batch transfer Catalyst if from is the owner of token", async function () {
        const { Catalyst, users } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.safeBatchTransferFrom(
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it("should be able to safe transfer Catalyst if from is the owner of Catalyst and to is a blacklisted marketplace", async function () {
        const { mockMarketPlace1, Catalyst, users } =
          await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.safeTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          1,
          1,
          "0x"
        );

        expect(
          await Catalyst.balanceOf(mockMarketPlace1.address, 1)
        ).to.be.equal(1);
      });

      it("should be able to safe batch transfer Catalysts if from is the owner of Catalysts and to is a blacklisted marketplace", async function () {
        const { mockMarketPlace1, Catalyst, users } =
          await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.safeBatchTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          [1, 2],
          [1, 1],
          "0x"
        );

        expect(
          await Catalyst.balanceOf(mockMarketPlace1.address, 1)
        ).to.be.equal(1);
        expect(
          await Catalyst.balanceOf(mockMarketPlace1.address, 2)
        ).to.be.equal(1);
      });

      it("it should not setApprovalForAll blacklisted market places", async function () {
        const { mockMarketPlace1, users } = await setupOperatorFilter();
        await expect(
          users[0].Catalyst.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.reverted;
      });

      it("it should setApprovalForAll non blacklisted market places", async function () {
        const { mockMarketPlace3, Catalyst, users } =
          await setupOperatorFilter();
        users[0].Catalyst.setApprovalForAll(mockMarketPlace3.address, true);
        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);
      });

      it("it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ", async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
          users,
        } = await setupOperatorFilter();
        await users[0].Catalyst.setApprovalForAll(
          mockMarketPlace3.address,
          true
        );

        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          users[1].Catalyst.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.revertedWithCustomError;
      });

      it("it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ", async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace3.address
          );

        await users[0].Catalyst.setApprovalForAll(
          mockMarketPlace3.address,
          true
        );

        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          users[1].Catalyst.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.revertedWith;
      });

      it("it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ", async function () {
        const {
          mockMarketPlace1,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace1.address
          );

        await expect(
          users[0].Catalyst.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await users[0].Catalyst.setApprovalForAll(
          mockMarketPlace1.address,
          true
        );

        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
      });

      it("it should not be able to transfer through blacklisted market places", async function () {
        const { mockMarketPlace1, Catalyst, users } =
          await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            "0x"
          )
        ).to.be.revertedWithCustomError;
      });

      it("it should not be able to transfer through market places after they are blacklisted", async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            "0x"
          )
        ).to.be.revertedWithCustomError;
      });

      it("it should be able to transfer through non blacklisted market places", async function () {
        const { mockMarketPlace3, Catalyst, users } =
          await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it("it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted", async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace3.address
          );
        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            "0x"
          )
        ).to.be.revertedWithCustomError;
      });

      it("it should be able to transfer through blacklisted market places after they are removed from blacklist", async function () {
        const {
          mockMarketPlace1,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace1.address
          );
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            "0x"
          )
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it("it should not be able to batch transfer through blacklisted market places", async function () {
        const { mockMarketPlace1, Catalyst, users } =
          await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            "0x"
          )
        ).to.be.revertedWithCustomError;
      });

      it("it should not be able to batch transfer through market places after they are blacklisted", async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);

        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            "0x"
          )
        ).to.be.revertedWithCustomError;
      });

      it("it should be able to batch transfer through non blacklisted market places", async function () {
        const { mockMarketPlace3, Catalyst, users } =
          await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it("it should not be able to batch transfer through non blacklisted market places after their codeHash is blacklisted", async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace3.address
          );
        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            "0x"
          )
        ).to.be.revertedWithCustomError;
      });

      it("it should be able to batch transfer through blacklisted market places after they are removed from blacklist", async function () {
        const {
          mockMarketPlace1,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace1.address
          );
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            "0x"
          )
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          "0x"
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);
      });
    });
  });
});
