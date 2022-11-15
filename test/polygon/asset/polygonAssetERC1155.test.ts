import {setupPolygonAsset} from './fixtures';
import {
  waitFor,
  getNftIndex,
  getAssetChainIndex,
  expectEventWithArgs,
} from '../../utils';
import {expect} from '../../chai-setup';
import {sendMetaTx} from '../../sendMetaTx';
import {ethers} from 'hardhat';
import {constants} from 'ethers';
import {setupOperatorFilter} from '../assetERC721/fixtures';

const zeroAddress = constants.AddressZero;

// PolygonAssetERC1155 tests for 'Asset'

// Notes on collections:
// The ERC1155 `collectionIndex` increments by 1 for each tokenId within that pack (using mintMultiple)
// The ERC1155 `collectionIndexOf` are all the same as each other within that packID (using mintMultiple)
// The ERC721 `collectionIndexOf` increments by 1 for each new extraction from that ERC1155's supply

describe('PolygonAssetERC1155.sol', function () {
  describe('PolygonAsset: general', function () {
    it('user sending asset to itself keep the same balance', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).safeTransferFrom(
          users[0].address,
          users[0].address,
          tokenId,
          10,
          '0x'
        )
      );
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('user batch sending asset to itself keep the same balance', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).safeBatchTransferFrom(
          users[0].address,
          users[0].address,
          [tokenId],
          [10],
          '0x'
        )
      );
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(20);
    });

    it('user batch sending in series whose total is more than its balance', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).safeBatchTransferFrom(
          users[0].address,
          users[0].address,
          [tokenId, tokenId, tokenId],
          [10, 20, 20],
          '0x'
        )
      );
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(20);
    });

    it('user batch sending more asset than it owns should fails', async function () {
      const {users, mintAsset, PolygonAssetERC1155} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).safeBatchTransferFrom(
          users[0].address,
          users[0].address,
          [tokenId],
          [30],
          '0x'
        )
      ).to.be.revertedWith(`BALANCE_TOO_LOW`);
    });

    it('NFT index is 0 for a new ERC1155 tokenId', async function () {
      const {users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      const nftIndex = getNftIndex(tokenId);
      expect(nftIndex).to.be.equal(0);
    });

    it('can get chainIndex from tokenId', async function () {
      const {users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      const chainIndex = getAssetChainIndex(tokenId);
      expect(chainIndex).to.be.equal(1);
    });

    it('can get the URI for an asset with amount 1', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 1);
      const URI = await PolygonAssetERC1155.callStatic.uri(tokenId);
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('can get the URI for a FT', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      const URI = await PolygonAssetERC1155.callStatic.uri(tokenId);
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('fails get the URI for an invalid tokeId', async function () {
      const {PolygonAssetERC1155} = await setupPolygonAsset();
      const tokenId = 42;
      await expect(
        PolygonAssetERC1155.callStatic.uri(tokenId)
      ).to.be.revertedWith('INVALID_ID');
    });

    it('can burn ERC1155 asset', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).burnFrom(users[0].address, tokenId, 10)
      );
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('can mint and burn asset of amount 1', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 1);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(1);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).burnFrom(users[0].address, tokenId, 1)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(0);
    });
    it('can mint repeatedly', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
      const newTokenId = await mintAsset(users[0].address, 10);
      const secondBalance = await PolygonAssetERC1155[
        'balanceOf(address,uint256)'
      ](users[0].address, newTokenId);
      expect(secondBalance).to.be.equal(10);
    });
  });

  describe('PolygonAsset: MetaTransactions', function () {
    it('can transfer by metaTx', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        trustedForwarder,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await PolygonAssetERC1155.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[1].address);

      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('fails to transfer someone else token by metaTx', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        trustedForwarder,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await PolygonAssetERC1155.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[2].address);

      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      expect(balance).to.be.equal(0);
    });

    it('can batch-transfer by metaTx', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        trustedForwarder,
      } = await setupPolygonAsset();
      const tokenId1 = await mintAsset(users[1].address, 7);
      const tokenId2 = await mintAsset(users[1].address, 3);
      const tokenIds = [tokenId1, tokenId2];
      const values = [7, 3];

      const {to, data} = await PolygonAssetERC1155.populateTransaction[
        'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
      ](users[1].address, users[2].address, tokenIds, values, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[1].address);

      const balance1 = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId1
      );
      const balance2 = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId2
      );
      expect(balance1).to.be.equal(7);
      expect(balance2).to.be.equal(3);
    });
  });

  describe('PolygonAsset: extractERC721From and collection information', function () {
    it('cannot extract ERC721 for ERC1155 supply == 1', async function () {
      const {
        PolygonAssetERC1155,
        mintAsset,
        extractor,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 1);
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(1);

      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, extractor)
      ).to.be.revertedWith('UNIQUE_ERC1155');
    });
    it('can extract ERC721 if ERC1155 supply > 1', async function () {
      const {
        PolygonAssetERC1155,
        PolygonAssetERC721,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 100);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(100);
      const result = await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, extractor)
      );
      const event = await expectEventWithArgs(
        PolygonAssetERC1155,
        result,
        'Extraction'
      );

      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      const owner = await PolygonAssetERC721.ownerOf(event.args[1]);
      expect(owner).to.be.equal(extractor);

      expect(balance).to.be.equal(99);
      const nftBal = await PolygonAssetERC721.balanceOf(extractor);
      expect(nftBal).to.be.equal(1);
    });
    it('can extract to own address if sender == _msgSender() and supply > 1', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, extractor)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(extractor);
      expect(nftBal).to.be.equal(1);
    });
    it('can extract to other address if sender == _msgSender() and supply > 1', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        users,
        extractor,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, users[3].address)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(users[3].address);
      expect(nftBal).to.be.equal(1);
    });
    it('cannot extract to destination address if sender == _msgSender() but sender is not owner of ERC1155', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        users,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, users[1].address)
      ).to.be.revertedWith("can't substract more than there is");
    });
    it('cannot extract to destination address if isApprovedForAll(sender, _msgSender()) but sender is not bouncer', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        extractor,
        users,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).setApprovalForAllFor(extractor, users[4].address, true); // sender, operator, approved

      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[4].address)
        ).extractERC721From(extractor, tokenId, extractor)
      ).to.be.revertedWith('!BOUNCER');
    });
    it('can extract to destination address if isApprovedForAll(sender, _msgSender())', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        extractor,
        users,
        mintAsset,
        PolygonAssetERC721,
        assetBouncerAdmin,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).setApprovalForAllFor(extractor, users[4].address, true); // sender, operator, approved

      // Set up users[4] as a bouncer
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(assetBouncerAdmin)
      ).setBouncer(users[4].address, true);

      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[4].address)
        ).extractERC721From(extractor, tokenId, extractor)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(extractor);
      expect(nftBal).to.be.equal(1);
    });
    it('can extract to other destination address if isApprovedForAll(sender, _msgSender())', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        users,
        extractor,
        mintAsset,
        PolygonAssetERC721,
        assetBouncerAdmin,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(10);

      // Set up users[4] as a bouncer
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(assetBouncerAdmin)
      ).setBouncer(users[4].address, true);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).setApprovalForAllFor(extractor, users[4].address, true); // sender, operator, approved
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[4].address)
        ).extractERC721From(extractor, tokenId, users[5].address)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(users[5].address);
      expect(nftBal).to.be.equal(1);
    });
    it('cannot extract to destination address if isApprovedForAll(sender, _msgSender()) but sender is not owner of ERC1155', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        users,
        extractor,
        mintAsset,
        assetBouncerAdmin,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).setApprovalForAllFor(extractor, users[4].address, true);

      // Set up users[4] as a bouncer
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(assetBouncerAdmin)
      ).setBouncer(users[4].address, true);

      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[4].address)
        ).extractERC721From(users[4].address, tokenId, extractor)
      ).to.be.revertedWith("can't substract more than there is");
    });
    it('cannot extract ERC721 if supply == 1 if sender == _msgSender()', async function () {
      const {
        PolygonAssetERC1155,
        users,
        extractor,
        mintAsset,
        assetBouncerAdmin,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 1);
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(1);

      // Set up users[2] as a bouncer
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(assetBouncerAdmin)
      ).setBouncer(users[2].address, true);

      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, extractor)
      ).to.be.revertedWith('UNIQUE_ERC1155');
    });
    it('cannot extract ERC721 if supply == 1 if msgSender() is not approved operator', async function () {
      const {
        PolygonAssetERC1155,
        users,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 1);
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(1);

      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[1].address)
        ).extractERC721From(extractor, tokenId, extractor)
      ).to.be.revertedWith('!AUTHORIZED');
    });
    it('can retrieve Extraction event with ERC1155 id and new ERC721 id and they are not the same as each other', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const receipt = await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, extractor)
      );
      const extractionEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const args = extractionEvent.args;

      expect(args[0]).to.be.equal(tokenId);
      expect(args[1]).not.to.be.equal(tokenId);
    });
    it('cannot extract ERC721 if to == zeroAddress', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, zeroAddress)
      ).to.be.revertedWith('TO==0');
    });
    it('can extract more than once', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(10);

      const receipt1 = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const extractionEvent1 = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt1,
        'Extraction'
      );
      const nftId1 = extractionEvent1.args[1];
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(9);
      let nftBal = await PolygonAssetERC721.balanceOf(extractor);
      expect(nftBal).to.be.equal(1);
      const receipt2 = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      const extractionEvent2 = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt2,
        'Extraction'
      );
      const nftId2 = extractionEvent2.args[1];
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        extractor,
        tokenId
      );
      expect(balance).to.be.equal(8);
      nftBal = await PolygonAssetERC721.balanceOf(extractor);
      expect(nftBal).to.be.equal(2);
      expect(nftId1).to.be.not.equal(nftId2);
    });
    it('can get the new ERC721 ID returned from extraction event', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();
      expect(tokenId).not.to.be.equal(newId);
    });
    it('can get the new ERC721 ID returned from extraction tx', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const newId = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).callStatic.extractERC721From(extractor, tokenId, extractor);
      expect(tokenId).not.to.be.equal(newId);
    });
    it('can check collectionOf for new ERC721 gives the ERC1155 ID', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();
      expect(tokenId).not.to.be.equal(newId);
      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenId);
      expect(collectionOf).to.be.equal(tokenId);
      const isCollection = await PolygonAssetERC1155.isCollection(tokenId);
      expect(isCollection).to.be.true;
      const collectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        tokenId
      );
      expect(collectionIndexOf).to.be.equal(0);
      const nftCollection = await PolygonAssetERC1155.collectionOf(newId);
      expect(nftCollection).to.be.equal(collectionOf);
      const nftIsCollection = await PolygonAssetERC1155.isCollection(newId);
      expect(nftIsCollection).to.be.true;
      const nftCollectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );
      expect(nftCollectionIndexOf).to.be.equal(1);
    });
    it('can still check collectionOf for new ERC721 if I burn my ERC1155', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();
      expect(tokenId).not.to.be.equal(newId);
      // Burn all remaining ERC1155
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).burn(tokenId, 9);
      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenId);
      const isCollection = await PolygonAssetERC1155.isCollection(tokenId);
      expect(isCollection).to.be.true;
      const collectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        tokenId
      );
      expect(collectionIndexOf).to.be.equal(0);
      const nftCollection = await PolygonAssetERC1155.collectionOf(newId);
      expect(nftCollection).to.be.equal(collectionOf);
      const nftIsCollection = await PolygonAssetERC1155.isCollection(newId);
      expect(nftIsCollection).to.be.true;
      const nftCollectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );
      expect(nftCollectionIndexOf).to.be.equal(1);
    });
    it('can extract my last ERC1155 to an ERC721 (as long as supply was > 1 originally)', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 2);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
    });
    it('cannot burn ERC1155 after extraction if there is no more supply', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 2);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      await expect(
        PolygonAssetERC1155.connect(ethers.provider.getSigner(extractor)).burn(
          tokenId,
          1
        )
      ).to.be.revertedWith("can't substract more than there is");
    });
    it('can check collectionOf for new ERC721 correctly increments by 1 compared to the ERC1155 it was extracted from', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();
      expect(tokenId).not.to.be.equal(newId);
      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenId);
      expect(collectionOf).to.be.equal(tokenId);
      const isCollection = await PolygonAssetERC1155.isCollection(tokenId);
      expect(isCollection).to.be.true;
      const collectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        tokenId
      );
      expect(collectionIndexOf).to.be.equal(0);
      const nftCollection = await PolygonAssetERC1155.collectionOf(newId);
      expect(nftCollection).to.be.equal(collectionOf);
      const nftIsCollection = await PolygonAssetERC1155.isCollection(newId);
      expect(nftIsCollection).to.be.true;
      const nftCollectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );
      expect(nftCollectionIndexOf).to.be.equal(1);
    });
    it('can burn then extract and then burn some more', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 5);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).burn(tokenId, 1);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).burn(tokenId, 1);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).burn(tokenId, 1);
    });
    it('can mint multiple and extract from multiple IDs in a pack as long as the id has supply > 1', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintMultipleAsset,
      } = await setupPolygonAsset();
      const tokenIds = await mintMultipleAsset(extractor, [2, 4, 7, 1]);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[1], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[0], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[0], extractor);
    });
    it('cannot extract from tokenId minted with mintMultiple if supply == 1', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintMultipleAsset,
      } = await setupPolygonAsset();
      const tokenIds = await mintMultipleAsset(extractor, [2, 4, 7, 1]);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[1], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[0], extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[0], extractor);
      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenIds[3], extractor)
      ).to.be.revertedWith('UNIQUE_ERC1155');
    });
    it('can mintMultiple and check collectionOf for a new ERC721 correctly increments by 1 compared to the ERC1155 it was extracted from', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintMultipleAsset,
      } = await setupPolygonAsset();
      const tokenIds = await mintMultipleAsset(extractor, [2, 4, 7, 1]);

      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);

      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();
      expect(tokenIds[2]).not.to.be.equal(newId);

      // [0]
      const collectionOf_0 = await PolygonAssetERC1155.collectionOf(
        tokenIds[0]
      );
      expect(collectionOf_0).to.be.equal(tokenIds[0]);
      expect(collectionOf_0).not.to.be.equal(tokenIds[1]);
      expect(collectionOf_0).not.to.be.equal(tokenIds[2]);
      expect(collectionOf_0).not.to.be.equal(tokenIds[3]);

      const isCollection_0 = await PolygonAssetERC1155.isCollection(
        tokenIds[0]
      );
      expect(isCollection_0).to.be.true;
      const collectionIndexOf_0 = await PolygonAssetERC1155.collectionIndexOf(
        tokenIds[0]
      );
      expect(collectionIndexOf_0).to.be.equal(0);

      // [1]
      const collectionOf_1 = await PolygonAssetERC1155.collectionOf(
        tokenIds[1]
      );
      expect(collectionOf_1).to.be.equal(tokenIds[1]);

      const isCollection_1 = await PolygonAssetERC1155.isCollection(
        tokenIds[1]
      );
      expect(isCollection_1).to.be.true;
      const collectionIndexOf_1 = await PolygonAssetERC1155.collectionIndexOf(
        tokenIds[1]
      );
      expect(collectionIndexOf_1).to.be.equal(0);

      // [2]
      const collectionOf_2 = await PolygonAssetERC1155.collectionOf(
        tokenIds[2]
      );
      expect(collectionOf_2).to.be.equal(tokenIds[2]);

      const isCollection_2 = await PolygonAssetERC1155.isCollection(
        tokenIds[2]
      );
      expect(isCollection_2).to.be.true;
      const collectionIndexOf_2 = await PolygonAssetERC1155.collectionIndexOf(
        tokenIds[2]
      );
      expect(collectionIndexOf_2).to.be.equal(0);

      // [3]

      const collectionOf_3 = await PolygonAssetERC1155.collectionOf(
        tokenIds[3]
      );
      expect(collectionOf_3).not.to.be.equal(tokenIds[3]); // is not equal because IS_NFT is set to 1
      const isCollection_3 = await PolygonAssetERC1155.isCollection(
        tokenIds[3]
      );
      expect(isCollection_3).to.be.true;
      const collectionIndexOf_3 = await PolygonAssetERC1155.collectionIndexOf(
        tokenIds[3]
      );
      expect(collectionIndexOf_3).to.be.equal(0);

      // ERC721 - 1
      const nftCollection = await PolygonAssetERC1155.collectionOf(newId);
      expect(nftCollection).to.be.equal(collectionOf_2);
      const nftIsCollection = await PolygonAssetERC1155.isCollection(newId);
      expect(nftIsCollection).to.be.true;
      const nftCollectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );
      expect(nftCollectionIndexOf).to.be.equal(1);

      const receiptSecondExtraction = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);

      const txEvent2 = await expectEventWithArgs(
        PolygonAssetERC1155,
        receiptSecondExtraction,
        'Extraction'
      );
      const newId2 = txEvent2.args.newId.toString();
      expect(tokenIds[2]).not.to.be.equal(newId2);

      // ERC721 - 2
      const nftCollection2 = await PolygonAssetERC1155.collectionOf(newId2);
      expect(nftCollection2).to.be.equal(collectionOf_2);
      const nftIsCollection2 = await PolygonAssetERC1155.isCollection(newId2);
      expect(nftIsCollection2).to.be.true;
      const nftCollectionIndexOf2 = await PolygonAssetERC1155.collectionIndexOf(
        newId2
      );
      // The ERC721 collectionIndexOf increments by 1 for each new extraction
      expect(nftCollectionIndexOf2).to.be.equal(2);
    });
    it('can see the index of my token after burning another token in the pack', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintMultipleAsset,
      } = await setupPolygonAsset();
      const tokenIds = await mintMultipleAsset(extractor, [2, 4, 7, 1]);

      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);

      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();

      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenIds[2]);
      const isCollection = await PolygonAssetERC1155.isCollection(tokenIds[2]);
      expect(isCollection).to.be.true;
      const collectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        tokenIds[2]
      );
      expect(collectionIndexOf).to.be.equal(0);

      // ERC721
      const nftCollection = await PolygonAssetERC1155.collectionOf(newId);
      expect(nftCollection).to.be.equal(collectionOf);
      const nftIsCollection = await PolygonAssetERC1155.isCollection(newId);
      expect(nftIsCollection).to.be.true;
      const nftCollectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );

      // Burn ERC1155
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).burn(tokenIds[2], 6);

      const nftCollectionAfterBurn = await PolygonAssetERC1155.collectionOf(
        newId
      );
      expect(nftCollectionAfterBurn).to.be.equal(collectionOf);
      const nftIsCollectionAfterBurn = await PolygonAssetERC1155.isCollection(
        newId
      );
      expect(nftIsCollectionAfterBurn).to.be.true;
      const nftCollectionIndexOfAfterBurn = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );
      expect(nftCollectionIndexOfAfterBurn).to.be.equal(nftCollectionIndexOf);
    });
    it('can see my ERC721 collection information in PolygonAssetERC1155 contract even after I burn that ERC721', async function () {
      const {
        PolygonAssetERC1155,
        PolygonAssetERC721,
        extractor,
        mintMultipleAsset,
      } = await setupPolygonAsset();
      const tokenIds = await mintMultipleAsset(extractor, [2, 4, 7, 1]);

      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenIds[2], extractor);

      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();

      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenIds[2]);
      const isCollection = await PolygonAssetERC1155.isCollection(tokenIds[2]);
      expect(isCollection).to.be.true;
      const collectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        tokenIds[2]
      );
      expect(collectionIndexOf).to.be.equal(0);

      // ERC721
      const nftCollection = await PolygonAssetERC1155.collectionOf(newId);
      expect(nftCollection).to.be.equal(collectionOf);
      const nftIsCollection = await PolygonAssetERC1155.isCollection(newId);
      expect(nftIsCollection).to.be.true;
      const nftCollectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );

      // Burn ERC721 (extractor has been granted BURNER_ROLE for testing)
      await PolygonAssetERC721.connect(
        ethers.provider.getSigner(extractor)
      ).burn(newId);

      const nftCollectionAfterBurn = await PolygonAssetERC1155.collectionOf(
        newId
      );
      expect(nftCollectionAfterBurn).to.be.equal(collectionOf);
      const nftIsCollectionAfterBurn = await PolygonAssetERC1155.isCollection(
        newId
      );
      expect(nftIsCollectionAfterBurn).to.be.true;
      const nftCollectionIndexOfAfterBurn = await PolygonAssetERC1155.collectionIndexOf(
        newId
      );
      expect(nftCollectionIndexOfAfterBurn).to.be.equal(nftCollectionIndexOf);
    });
    it('can see that my ERC1155 tokenId was minted even after I burn all ERC1155 in that pack', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 5);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).burn(tokenId, 5);

      const doesHashExist = await PolygonAssetERC1155.doesHashExist(tokenId);
      expect(doesHashExist).to.be.true;
    });
    it('can see that my ERC1155 tokenId was minted even after I burn and extract all ERC1155 in that pack', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 2);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).burn(tokenId, 1);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      const doesHashExist = await PolygonAssetERC1155.doesHashExist(tokenId);
      expect(doesHashExist).to.be.true;
    });

    it('can get the URI for an asset of amount 2', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 2);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const URI = await PolygonAssetERC1155.callStatic.uri(tokenId);
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('can correctly obtain ERC721 metadata after extraction', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 10);
      const URI = await PolygonAssetERC1155.callStatic.uri(tokenId);
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
      const receipt = await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(extractor)
        ).extractERC721From(extractor, tokenId, extractor)
      );

      const extractionEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const nftId = extractionEvent.args[1];

      const nftURI = await PolygonAssetERC721.callStatic.tokenURI(nftId);
      expect(nftURI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('get the same URI when extract a 721', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 2);
      const nftId = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).callStatic.extractERC721From(extractor, tokenId, extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const URI = await PolygonAssetERC1155.callStatic.uri(tokenId);
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
      const nftURI = await PolygonAssetERC1155.callStatic.uri(nftId.toString());
      expect(URI).to.be.equal(nftURI);
      expect(nftURI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('get the same URIs for extracted 721s from same ERC1155 collection', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 3);
      const nftId1 = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).callStatic.extractERC721From(extractor, tokenId, extractor);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);
      const nftId2 = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).callStatic.extractERC721From(extractor, tokenId, extractor);
      const URI = await PolygonAssetERC1155.callStatic.uri(tokenId);
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
      const nftURI1 = await PolygonAssetERC1155.callStatic.uri(
        nftId1.toString()
      );
      const nftURI2 = await PolygonAssetERC1155.callStatic.uri(
        nftId2.toString()
      );

      expect(nftURI1).to.be.equal(nftURI2);
      expect(nftURI1).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
      expect(nftURI2).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('can get the chainId from extracted 721s and it does not cut across NFT_INDEX', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 3);
      const chainIndexOriginal = getAssetChainIndex(tokenId);
      expect(chainIndexOriginal).to.be.equal(1);

      const nftId1 = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).callStatic.extractERC721From(extractor, tokenId, extractor);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      const chainIndex1 = getAssetChainIndex(nftId1);
      expect(chainIndex1).to.be.equal(1);

      // NFT_INDEX
      // get chars 48 to 56 (start count from left)
      const nftIndex1 = getNftIndex(nftId1);
      expect(nftIndex1).to.be.equal(1);

      const nftId2 = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).callStatic.extractERC721From(extractor, tokenId, extractor);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(extractor)
      ).extractERC721From(extractor, tokenId, extractor);

      const chainIndex2 = getAssetChainIndex(nftId2);
      expect(chainIndex2).to.be.equal(1);

      const nftIndex2 = getNftIndex(nftId2);
      expect(nftIndex2).to.be.equal(2);
    });

    it('can use chainIndex getter to obtain chainIndex for a given ID', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 3);
      const chainIndexFromId = getAssetChainIndex(tokenId);
      const chainIndexContract = await PolygonAssetERC1155.getChainIndex(
        tokenId
      );
      expect(chainIndexFromId).to.be.equal(chainIndexContract);
    });

    it('collectionOf for ERC1155 with supply == 1 is NOT equal to tokenId because IS_NFT is 1', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 1);

      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenId);
      expect(collectionOf).not.to.be.equal(tokenId); // this is not equal, because tokenId has IS_NFT set to 1. When supply > 1 these are equal
      // 0x14dc79964da2c08b23698b3d3cc7ca32193d9955808000000000000000800000 tokenId
      // 0x14dc79964da2c08b23698b3d3cc7ca32193d9955008000000000000000800000 collectionOf
      const isCollection = await PolygonAssetERC1155.isCollection(tokenId);
      expect(isCollection).to.be.true;
      const collectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        tokenId
      );
      expect(collectionIndexOf).to.be.equal(0);
    });

    it('collectionOf for ERC1155 with supply > 1 is equal to tokenId', async function () {
      const {
        PolygonAssetERC1155,
        extractor,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(extractor, 2);

      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenId);
      expect(collectionOf).to.be.equal(tokenId); // this is equal
      // 0x14dc79964da2c08b23698b3d3cc7ca32193d9955008000000000000000800000 tokenId
      // 0x14dc79964da2c08b23698b3d3cc7ca32193d9955008000000000000000800000 collectionOf
      const isCollection = await PolygonAssetERC1155.isCollection(tokenId);
      expect(isCollection).to.be.true;
      const collectionIndexOf = await PolygonAssetERC1155.collectionIndexOf(
        tokenId
      );
      expect(collectionIndexOf).to.be.equal(0);
    });
  });

  describe('PolygonAssetERC1155: operator filterer', function () {
    it('should be registered', async function () {
      const {
        operatorFilterRegistry,
        polygonAssetERC1155,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isRegistered(polygonAssetERC1155.address)
      ).to.be.equal(true);
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        polygonAssetERC1155,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(polygonAssetERC1155.address)
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('should have market places blacklisted', async function () {
      const {
        mockMarketPlace1,
        mockMarketPlace2,
        operatorFilterRegistry,
        polygonAssetERC1155,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace1.address
      );
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          polygonAssetERC1155.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          polygonAssetERC1155.address,
          mockMarketPlace1CodeHash
        )
      ).to.be.equal(true);

      const mockMarketPlace2CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace2.address
      );
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          polygonAssetERC1155.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          polygonAssetERC1155.address,
          mockMarketPlace2CodeHash
        )
      ).to.be.equal(true);
    });

    it('should be able to transfer token if from is the owner of token', async function () {
      const {
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      await polygonAssetERC1155.safeTransferFrom(
        users[0].address,
        users[1].address,
        id,
        5,
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id)
      ).to.be.equal(5);
    });

    it('should be able to batch transfer token if from is the owner of token', async function () {
      const {
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await polygonAssetERC1155.safeBatchTransferFrom(
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id1)
      ).to.be.equal(5);
      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id2)
      ).to.be.equal(5);
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      await polygonAssetERC1155.safeTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        id,
        5,
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(mockMarketPlace1.address, id)
      ).to.be.equal(5);
    });

    it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await polygonAssetERC1155.safeBatchTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(mockMarketPlace1.address, id1)
      ).to.be.equal(5);
      expect(
        await polygonAssetERC1155.balanceOf(mockMarketPlace1.address, id2)
      ).to.be.equal(5);
    });

    it('it should not approve blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
      } = await setupOperatorFilter();

      await expect(
        polygonAssetERC1155.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('it should approve non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();
      await users[0].polygonAssetERC1155.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );
      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();
      await users[0].polygonAssetERC1155.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].polygonAssetERC1155.setApprovalForAll(
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].polygonAssetERC1155.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].polygonAssetERC1155.setApprovalForAll(
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].polygonAssetERC1155.setApprovalForAll(
          mockMarketPlace1.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].polygonAssetERC1155.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not approve for all for blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
      } = await setupOperatorFilter();

      await expect(
        polygonAssetERC1155.setApprovalForAllFor(mockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('it should approve for all for non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();
      await users[0].polygonAssetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );
      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to approve for all for non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();

      await users[0].polygonAssetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].polygonAssetERC1155.setApprovalForAllFor(
          users[1].address,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve for all for non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].polygonAssetERC1155.setApprovalForAllFor(
          users[1].address,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve for all for blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonAssetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].polygonAssetERC1155.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace1.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].polygonAssetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace1.address,
        true
      );

      expect(
        await polygonAssetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.transferTokenForERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.transferTokenForERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id)
      ).to.be.equal(2);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenForERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.transferTokenForERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id)
      ).to.be.equal(2);
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is filtered', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.transferTokenForERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id)
      ).to.be.equal(2);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );
      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenForERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
          '0x'
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );

      await expect(
        mockMarketPlace1.transferTokenForERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );
      await mockMarketPlace1.transferTokenForERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id)
      ).to.be.equal(2);
    });

    it('it should not be able to batch transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.batchTransferTokenERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [1, 1],
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to batch transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [10, 10],
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id1)
      ).to.be.equal(10);

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id2)
      ).to.be.equal(10);
    });

    it('it should be not be able to batch transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id1)
      ).to.be.equal(5);

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id2)
      ).to.be.equal(5);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.batchTransferTokenERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [5, 5],
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be not be able to batch transfer through market places after their codeHash is filtered', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id1)
      ).to.be.equal(5);

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id2)
      ).to.be.equal(5);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        mockMarketPlace3.batchTransferTokenERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [5, 5],
          '0x'
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to batch transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].polygonAssetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.batchTransferTokenERC1155(
          polygonAssetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [5, 5],
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );
      await mockMarketPlace1.batchTransferTokenERC1155(
        polygonAssetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id1)
      ).to.be.equal(5);

      expect(
        await polygonAssetERC1155.balanceOf(users[1].address, id2)
      ).to.be.equal(5);
    });
  });
});
