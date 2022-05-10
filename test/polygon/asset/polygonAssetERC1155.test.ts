import {setupPolygonAsset} from './fixtures';
import {waitFor, getAssetChainIndex, expectEventWithArgs} from '../../utils';
import {expect} from '../../chai-setup';
import {sendMetaTx} from '../../sendMetaTx';
import {ethers} from 'hardhat';
import {constants} from 'ethers';

const zeroAddress = constants.AddressZero;

// PolygonAssetERC1155 tests for 'Asset'
describe('PolygonAssetERC1155.sol', function () {
  it('user sending asset to itself keep the same balance', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 10);
    await waitFor(
      PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).safeTransferFrom(users[0].address, users[0].address, tokenId, 10, '0x')
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

  it('can get the chainIndex from the tokenId', async function () {
    const {users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const chainIndex = getAssetChainIndex(tokenId);
    expect(chainIndex).to.be.equal(1);
  });

  it('can get the URI for an asset with amount 1', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[1].address, 1);
    const URI = await PolygonAssetERC1155.callStatic.tokenURI(tokenId);
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('can get the URI for a FT', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const URI = await PolygonAssetERC1155.callStatic.tokenURI(tokenId);
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('fails get the URI for an invalid tokeId', async function () {
    const {PolygonAssetERC1155} = await setupPolygonAsset();
    const tokenId = 42;
    await expect(
      PolygonAssetERC1155.callStatic.tokenURI(tokenId)
    ).to.be.revertedWith('NFT_!EXIST_||_FT_!MINTED');
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
  // TODO: burn
  // TODO: what happens to tokenId on burn
  // TODO: what happens for bad param. On etherscan I sent "0x42" instead of

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

  describe('PolygonAsset: extractERC721From', function () {
    it('can extract ERC721 for ERC1155 supply == 1', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 1);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(1);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).extractERC721From(users[0].address, tokenId, users[0].address)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(0);
      const nftBal = await PolygonAssetERC721.balanceOf(users[0].address);
      expect(nftBal).to.be.equal(1);
    });
    it('can extract ERC721 if ERC1155 supply > 1', async function () {
      const {
        PolygonAssetERC1155,
        PolygonAssetERC721,
        users,
        mintAsset,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 100);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(100);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).extractERC721From(users[0].address, tokenId, users[0].address);
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(99);
      const nftBal = await PolygonAssetERC721.balanceOf(users[0].address);
      expect(nftBal).to.be.equal(1);
    });
    it('can extract to own address if sender == _msgSender() and supply > 1', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[1].address)
        ).extractERC721From(users[1].address, tokenId, users[1].address)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(users[1].address);
      expect(nftBal).to.be.equal(1);
    });
    it('can extract to other address if sender == _msgSender() and supply > 1', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[1].address)
        ).extractERC721From(users[1].address, tokenId, users[3].address)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(users[3].address);
      expect(nftBal).to.be.equal(1);
    });
    it('cannot extract to destination address if sender == _msgSender() but sender is not owner of ERC1155', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).extractERC721From(users[0].address, tokenId, users[1].address)
      ).to.be.revertedWith('!NFT');
    });
    it('can extract to destination address if isApprovedForAll(sender, _msgSender())', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[1].address)
      ).setApprovalForAllFor(users[1].address, users[4].address, true); // sender, operator, approved
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[4].address)
        ).extractERC721From(users[1].address, tokenId, users[1].address)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(users[1].address);
      expect(nftBal).to.be.equal(1);
    });
    it('can extract to other destination address if isApprovedForAll(sender, _msgSender())', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[1].address)
      ).setApprovalForAllFor(users[1].address, users[4].address, true); // sender, operator, approved
      await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[4].address)
        ).extractERC721From(users[1].address, tokenId, users[5].address)
      );
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );
      expect(balance).to.be.equal(9);
      const nftBal = await PolygonAssetERC721.balanceOf(users[5].address);
      expect(nftBal).to.be.equal(1);
    });
    it('cannot extract to destination address if isApprovedForAll(sender, _msgSender()) but sender is not owner of ERC1155', async function () {
      // require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[1].address)
      ).setApprovalForAllFor(users[1].address, users[4].address, true);
      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[4].address)
        ).extractERC721From(users[4].address, tokenId, users[1].address)
      ).to.be.revertedWith('!NFT');
    });
    it('cannot extract ERC721 if supply == 1 if sender == _msgSender()', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(10);

      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[2].address)
        ).extractERC721From(users[0].address, tokenId, users[0].address)
      ).to.be.revertedWith('!AUTHORIZED');
    });
    it('cannot extract ERC721 if supply == 1 if sender is not approved operator', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 1);
      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(1);

      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).extractERC721From(users[1].address, tokenId, users[0].address)
      ).to.be.revertedWith('!AUTHORIZED');
    });
    it('can retrieve Extraction event with ERC1155 id and new ERC721 id and they are not the same as each other', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      const receipt = await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).extractERC721From(users[0].address, tokenId, users[0].address)
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
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      await expect(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[0].address)
        ).extractERC721From(users[0].address, tokenId, zeroAddress)
      ).to.be.revertedWith('TO==0');
    });
    it('can correctly obtain ERC721 metadata after extraction', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 10);
      const URI = await PolygonAssetERC1155.callStatic.tokenURI(tokenId);
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
      const receipt = await waitFor(
        PolygonAssetERC1155.connect(
          ethers.provider.getSigner(users[1].address)
        ).extractERC721From(users[1].address, tokenId, users[1].address)
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
    it('can extract more than once', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        PolygonAssetERC721,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).extractERC721From(users[0].address, tokenId, users[0].address);
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(9);
      let nftBal = await PolygonAssetERC721.balanceOf(users[0].address);
      expect(nftBal).to.be.equal(1);
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).extractERC721From(users[0].address, tokenId, users[0].address);
      balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(8);
      nftBal = await PolygonAssetERC721.balanceOf(users[0].address);
      expect(nftBal).to.be.equal(2);
    });
    it('can get the new ERC721 ID returned from extraction event', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).extractERC721From(users[0].address, tokenId, users[0].address);
      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();
      expect(tokenId).not.to.be.equal(newId);
    });
    it('can get the new ERC721 ID returned from extraction tx', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      const newId = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).callStatic.extractERC721From(
        users[0].address,
        tokenId,
        users[0].address
      );
      expect(tokenId).not.to.be.equal(newId);
    });
    it('can check collectionOf tokenId TODO:', async function () {
      const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
      const tokenId = await mintAsset(users[0].address, 10);
      const receipt = await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).extractERC721From(users[0].address, tokenId, users[0].address);
      const txEvent = await expectEventWithArgs(
        PolygonAssetERC1155,
        receipt,
        'Extraction'
      );
      const newId = txEvent.args.newId.toString();
      expect(tokenId).not.to.be.equal(newId);
      const collectionOf = await PolygonAssetERC1155.collectionOf(tokenId);
      // expect(collectionOf.toString()).to.be.equal(newId);
      const isCollection = await PolygonAssetERC1155.isCollection(tokenId);
      expect(isCollection).to.be.true;
    });
    // TODO: other collection checks
  });
});
