import {expect} from 'chai';
import {expectEventWithArgs} from '../util';
import {ethers} from 'hardhat';
import {runAssetSetup} from './fixtures/assetFixture';
import {setupOperatorFilter} from './fixtures/operatorFIlterFixture';

// TODO: test all events
// TODO: test all reverts
// TODO: trustedForwarder tests
// TODO: missing setTrustedForwarder default admin function
// TODO: tokenId tests (TokenIdUtils.sol)
describe('AssetContract', function () {
  it('Should deploy correctly', async function () {
    const {AssetContract} = await runAssetSetup();
    expect(AssetContract.address).to.be.properAddress;
  });

  describe('uri_and_baseUri', function () {
    it('Should return correct asset uri ', async function () {
      const {AssetContractAsMinter, AssetContract, owner, uris, baseUri} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId = args.args.id;
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[0]}`
      );
    });

    it("DEFAULT_ADMIN can change an asset's uri ", async function () {
      const {
        AssetContractAsMinter,
        AssetContract,
        AssetContractAsAdmin,
        owner,
        uris,
        baseUri,
      } = await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId = args.args.id;
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[0]}`
      );

      await AssetContractAsAdmin.setTokenUri(tokenId, uris[1]);
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[1]}`
      );
    });

    it("DEFAULT_ADMIN can change the contract's base uri ", async function () {
      const {AssetContractAsAdmin} = await runAssetSetup();
      await expect(AssetContractAsAdmin.setBaseURI('newUri')).to.not.be
        .reverted;
    });

    it('if not DEFAULT_ADMIN cannot change an asset uri ', async function () {
      const {
        AssetContractAsMinter,
        AssetContract,
        AssetContractAsOwner,
        owner,
        uris,
        baseUri,
        defaultAdminRole,
      } = await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId = args.args.id;
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[0]}`
      );
      await expect(
        AssetContractAsOwner.setTokenUri(tokenId, uris[2])
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLocaleLowerCase()} is missing role ${defaultAdminRole}`
      );
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[0]}`
      );
    });

    it("if not DEFAULT_ADMIN cannot change the contract's base uri ", async function () {
      const {AssetContractAsOwner, owner, defaultAdminRole} =
        await runAssetSetup();
      await expect(
        AssetContractAsOwner.setBaseURI('newUri')
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLocaleLowerCase()} is missing role ${defaultAdminRole}`
      );
    });

    it('no two asset can have same uri ', async function () {
      const {AssetContractAsMinter, owner, uris} = await runAssetSetup();
      await AssetContractAsMinter.mint(owner.address, 10, 3, uris[0]);

      await expect(
        AssetContractAsMinter.mint(owner.address, 11, 3, uris[0])
      ).to.be.revertedWith('metadata hash mismatch for tokenId');
    });
  });

  describe('Minting', function () {
    it('Should mint an asset', async function () {
      const {AssetContractAsMinter, AssetContract, owner, uris} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner.address, tokenId)).to.be.equal(
        3
      );
    });

    it('only minter can mint an asset', async function () {
      const {AssetContract, owner, minterRole, uris} = await runAssetSetup();
      await expect(
        AssetContract.connect(owner).mint(owner.address, 10, 3, uris[0])
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it('Should mint Batch assets', async function () {
      const {AssetContractAsMinter, AssetContract, owner} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mintBatch(
        owner.address,
        [1, 2, 3, 4],
        [5, 5, 100, 1],
        ['xyz', 'abc', 'anotherUri', 'andAgain']
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferBatch'
      );
      const tokenIds = args.args.ids;
      expect(tokenIds[0]).to.be.equal(1);
      expect(tokenIds[1]).to.be.equal(2);
      expect(tokenIds[2]).to.be.equal(3);
      expect(tokenIds[3]).to.be.equal(4);
      expect(await AssetContract.balanceOf(owner.address, 1)).to.be.equal(5);
      expect(await AssetContract.balanceOf(owner.address, 2)).to.be.equal(5);
      expect(await AssetContract.balanceOf(owner.address, 3)).to.be.equal(100);
      expect(await AssetContract.balanceOf(owner.address, 4)).to.be.equal(1);
    });

    it('only minter can mint batch an asset', async function () {
      const {AssetContract, owner, minterRole} = await runAssetSetup();
      await expect(
        AssetContract.connect(owner).mintBatch(
          owner.address,
          [1, 2, 3, 4],
          [5, 5, 100, 1],
          ['xyz', 'abc', 'anotherUri', 'andAgain']
        )
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });
  });

  describe('Burn Assets', function () {
    it('BURNER_ROLE can use burnFrom to burn the asset of any owner', async function () {
      const {
        AssetContractAsMinter,
        AssetContractAsBurner,
        AssetContract,
        owner,
        uris,
      } = await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId = args.args.id;
      expect(tokenId).to.be.equal(10);
      expect(await AssetContract.balanceOf(owner.address, tokenId)).to.be.equal(
        3
      );
      await AssetContractAsBurner.burnFrom(owner.address, tokenId, 2);
      expect(await AssetContract.balanceOf(owner.address, tokenId)).to.be.equal(
        1
      );
    });

    it('If not BURNER_ROLE cannot burn asset of any owner', async function () {
      const {
        AssetContractAsMinter,
        owner,
        AssetContract,
        secondOwner,
        burnerRole,
        uris,
      } = await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId = args.args.id;
      expect(tokenId).to.be.equal(10);
      expect(await AssetContract.balanceOf(owner.address, tokenId)).to.be.equal(
        3
      );

      await expect(
        AssetContract.connect(secondOwner).burnFrom(owner.address, tokenId, 3)
      ).to.be.revertedWith(
        `AccessControl: account ${secondOwner.address.toLocaleLowerCase()} is missing role ${burnerRole}`
      );
    });

    it('owner can burn their own asset', async function () {
      const {AssetContractAsMinter, owner, AssetContract, uris} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId1 = args.args.id;

      expect(
        await AssetContract.balanceOf(owner.address, tokenId1)
      ).to.be.equal(3);

      await AssetContract.connect(owner).burn(owner.address, tokenId1, 3);

      expect(
        await AssetContract.balanceOf(owner.address, tokenId1)
      ).to.be.equal(0);
    });

    it("owner cannot burn someone else's asset", async function () {
      const {AssetContractAsMinter, owner, AssetContract, uris, secondOwner} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      await expectEventWithArgs(AssetContractAsMinter, tnx, 'TransferSingle');

      expect(await AssetContract.balanceOf(owner.address, 10)).to.be.equal(3);

      await expect(
        AssetContract.connect(
          await ethers.provider.getSigner(secondOwner.address)
        ).burn(owner.address, 10, 3)
      ).to.be.revertedWith(`ERC1155: caller is not token owner or approved`);

      expect(await AssetContract.balanceOf(owner.address, 10)).to.be.equal(3);
    });

    it('owner can batch burn their own assets', async function () {
      const {AssetContractAsMinter, owner, AssetContract} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mintBatch(
        owner.address,
        [1, 2, 3, 4],
        [5, 5, 100, 1],
        ['xyz', 'abc', 'anotherUri', 'andAgain']
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferBatch'
      );
      const tokenIds = args.args.ids;

      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[0])
      ).to.be.equal(5);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[1])
      ).to.be.equal(5);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[2])
      ).to.be.equal(100);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[3])
      ).to.be.equal(1);

      await AssetContract.connect(owner).burnBatch(
        owner.address,
        [1, 2, 3, 4],
        [4, 4, 20, 1]
      );

      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[0])
      ).to.be.equal(1);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[1])
      ).to.be.equal(1);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[2])
      ).to.be.equal(80);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[3])
      ).to.be.equal(0);
    });

    it("owner cannot batch burn someone else's assets", async function () {
      const {AssetContractAsMinter, owner, AssetContract, secondOwner} =
        await runAssetSetup();
      await AssetContractAsMinter.mintBatch(
        owner.address,
        [1, 2, 3, 4],
        [5, 5, 100, 1],
        ['xyz', 'abc', 'anotherUri', 'andAgain']
      );

      await expect(
        AssetContract.connect(secondOwner).burn(
          owner.address,
          [1, 2, 3, 4],
          [5, 5, 100, 1]
        )
      ).to.be.revertedWith(`ERC1155: caller is not token owner or approved`);

      expect(await AssetContract.balanceOf(owner.address, 1)).to.be.equal(5);
      expect(await AssetContract.balanceOf(owner.address, 2)).to.be.equal(5);
      expect(await AssetContract.balanceOf(owner.address, 3)).to.be.equal(100);
      expect(await AssetContract.balanceOf(owner.address, 4)).to.be.equal(1);
    });

    it('BURNER_ROLE can batch burn the assets of any owner', async function () {
      const {
        AssetContractAsMinter,
        AssetContractAsBurner,
        owner,
        AssetContract,
      } = await runAssetSetup();
      const tnx = await AssetContractAsMinter.mintBatch(
        owner.address,
        [1, 2, 3, 4],
        [5, 5, 100, 1],
        ['xyz', 'abc', 'anotherUri', 'andAgain']
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferBatch'
      );
      const tokenIds = args.args.ids;

      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[0])
      ).to.be.equal(5);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[1])
      ).to.be.equal(5);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[2])
      ).to.be.equal(100);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[3])
      ).to.be.equal(1);

      await AssetContractAsBurner.burnBatchFrom(
        owner.address,
        [1, 2, 3, 4],
        [4, 4, 20, 1]
      );

      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[0])
      ).to.be.equal(1);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[1])
      ).to.be.equal(1);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[2])
      ).to.be.equal(80);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[3])
      ).to.be.equal(0);
    });

    it('If not BURNER_ROLE cannot batch burn assets of any owner', async function () {
      const {
        AssetContractAsMinter,
        owner,
        AssetContract,
        secondOwner,
        burnerRole,
        uris,
      } = await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        3,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContractAsMinter,
        tnx,
        'TransferSingle'
      );
      const tokenId = args.args.id;
      expect(tokenId).to.be.equal(10);
      expect(await AssetContract.balanceOf(owner.address, tokenId)).to.be.equal(
        3
      );

      await expect(
        AssetContract.connect(secondOwner).burnFrom(owner.address, tokenId, 3)
      ).to.be.revertedWith(
        `AccessControl: account ${secondOwner.address.toLocaleLowerCase()} is missing role ${burnerRole}`
      );
    });
  });

  describe('Token transfer', function () {
    it('owner can transfer an asset', async function () {
      const {AssetContractAsMinter, owner, AssetContract, secondOwner, uris} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mint(
        owner.address,
        10,
        5,
        uris[0]
      );
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        'TransferSingle'
      );
      const tokenId1 = args.args.id;

      expect(
        await AssetContract.balanceOf(owner.address, tokenId1)
      ).to.be.equal(5);

      await AssetContract.connect(owner).safeTransferFrom(
        owner.address,
        secondOwner.address,
        tokenId1,
        5,
        '0x'
      );

      expect(
        await AssetContract.balanceOf(secondOwner.address, tokenId1)
      ).to.be.equal(5);
    });

    it('owner can batch transfer assets', async function () {
      const {AssetContractAsMinter, owner, AssetContract, secondOwner} =
        await runAssetSetup();
      const tnx = await AssetContractAsMinter.mintBatch(
        owner.address,
        [1, 2, 3, 4],
        [5, 5, 100, 1],
        ['xyz', 'abc', 'anotherUri', 'andAgain']
      );
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        'TransferBatch'
      );
      const tokenIds = args.args.ids;

      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[0])
      ).to.be.equal(5);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[1])
      ).to.be.equal(5);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[2])
      ).to.be.equal(100);
      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[3])
      ).to.be.equal(1);

      await AssetContract.connect(owner).safeBatchTransferFrom(
        owner.address,
        secondOwner.address,
        [tokenIds[0], tokenIds[1]],
        [5, 5],
        '0x'
      );

      expect(
        await AssetContract.balanceOf(secondOwner.address, tokenIds[0])
      ).to.be.equal(5);

      expect(
        await AssetContract.balanceOf(secondOwner.address, tokenIds[1])
      ).to.be.equal(5);

      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[0])
      ).to.be.equal(0);

      expect(
        await AssetContract.balanceOf(owner.address, tokenIds[1])
      ).to.be.equal(0);
    });
  });

  describe('OperatorFilterer', function () {
    describe('common subscription setup', function () {
      it('should be registered', async function () {
        const {operatorFilterRegistry, Asset} = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isRegistered(Asset.address)
        ).to.be.equal(true);
      });

      it('should be subscribed to common subscription', async function () {
        const {operatorFilterRegistry, Asset, filterOperatorSubscription} =
          await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.subscriptionOf(Asset.address)
        ).to.be.equal(filterOperatorSubscription);
      });

      it('default subscription should blacklist Mock Market places 1, 2 and not 3, 4', async function () {
        const {
          operatorFilterRegistry,
          Asset,
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
            filterOperatorSubscription,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            filterOperatorSubscription,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            filterOperatorSubscription,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            filterOperatorSubscription,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it('Asset should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          Asset,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it("removing market places from common subscription's blacklist should reflect on asset's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
          Asset,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            filterOperatorSubscription,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace1.address,
          false
        );

        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          MockERC1155MarketPlace1CodeHash,
          false
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            filterOperatorSubscription,
            mockMarketPlace1.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(false);
      });

      it("adding market places to common subscription's blacklist should reflect on asset's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace3,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
          Asset,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);
        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            filterOperatorSubscription,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace3.address,
          true
        );

        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          MockERC1155MarketPlace3CodeHash,
          true
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            filterOperatorSubscription,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            filterOperatorSubscription,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(true);
      });
    });

    describe('asset transfer and approval ', function () {
      it('should be able to safe transfer asset if from is the owner of token', async function () {
        const {Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.safeTransferFrom(
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('should be able to safe batch transfer asset if from is the owner of token', async function () {
        const {Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.safeBatchTransferFrom(
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it('should be able to safe transfer asset if from is the owner of asset and to is a blacklisted marketplace', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.safeTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(
          1
        );
      });

      it('should be able to safe batch transfer assets if from is the owner of assets and to is a blacklisted marketplace', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.safeBatchTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(
          1
        );
        expect(await Asset.balanceOf(mockMarketPlace1.address, 2)).to.be.equal(
          1
        );
      });

      it('it should not setApprovalForAll blacklisted market places', async function () {
        const {mockMarketPlace1, users} = await setupOperatorFilter();
        await expect(
          users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.reverted;
      });

      it('it should setApprovalForAll non blacklisted market places', async function () {
        const {mockMarketPlace3, Asset, users} = await setupOperatorFilter();
        users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);
        expect(
          await Asset.isApprovedForAll(
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
          Asset,
          users,
        } = await setupOperatorFilter();
        await users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);

        expect(
          await Asset.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace3.address,
          true
        );

        await expect(
          users[1].Asset.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.revertedWithCustomError;
      });

      it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
          Asset,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsSubscription.codeHashOf(
            mockMarketPlace3.address
          );

        await users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);

        expect(
          await Asset.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          users[1].Asset.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.revertedWith;
      });

      it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
        const {
          mockMarketPlace1,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
          Asset,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsSubscription.codeHashOf(
            mockMarketPlace1.address
          );

        await expect(
          users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace1.address,
          false
        );

        await users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true);

        expect(
          await Asset.isApprovedForAll(
            users[0].address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
      });

      it('it should not be able to transfer through blacklisted market places', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Asset.address,
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
          Asset,
          users,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should be able to transfer through non blacklisted market places', async function () {
        const {mockMarketPlace3, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
        const {
          mockMarketPlace3,
          Asset,
          users,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsSubscription.codeHashOf(
            mockMarketPlace3.address
          );
        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Asset.address,
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
          Asset,
          users,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsSubscription.codeHashOf(
            mockMarketPlace1.address
          );
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('it should not be able to batch transfer through blacklisted market places', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Asset.address,
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
          Asset,
          users,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should be able to batch transfer through non blacklisted market places', async function () {
        const {mockMarketPlace3, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it('it should not be able to batch transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
        const {
          mockMarketPlace3,
          Asset,
          users,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsSubscription.codeHashOf(
            mockMarketPlace3.address
          );
        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Asset.address,
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
          Asset,
          users,
          operatorFilterRegistryAsSubscription,
          filterOperatorSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsSubscription.codeHashOf(
            mockMarketPlace1.address
          );
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsSubscription.updateCodeHash(
          filterOperatorSubscription,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsSubscription.updateOperator(
          filterOperatorSubscription,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
      });
    });
  });
});
