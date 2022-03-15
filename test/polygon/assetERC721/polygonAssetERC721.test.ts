import {ethers} from 'hardhat';
import {expect} from 'chai';
import {setupAssetERC721Test} from './fixtures';
import {BigNumber} from 'ethers';
import {defaultAbiCoder, solidityPack} from 'ethers/lib/utils';

describe('PolygonAssetERC721.sol differences with AssetERC721.sol', function () {
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAssetERC721Test();
        const defaultAdminRole = await fixtures.polygonAssetERC721.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            defaultAdminRole,
            fixtures.adminRole
          )
        ).to.be.true;
      });
    });
    describe('child chain manager', function () {
      it('check initial roles', async function () {
        const fixtures = await setupAssetERC721Test();
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            fixtures.childChainManagerRole,
            fixtures.childChainManager
          )
        ).to.be.true;
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            fixtures.childChainManagerRole,
            fixtures.other
          )
        ).to.be.false;
      });
      it('child chain manager can mint tokens', async function () {
        const tokenId = BigNumber.from('0xdada1');
        const fixtures = await setupAssetERC721Test();
        const assetERC721AsChildChainManager = await ethers.getContract(
          'PolygonAssetERC721',
          fixtures.childChainManager
        );
        // Mint, withdraw
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
        await fixtures.polygonAssetERC721AsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await assetERC721AsChildChainManager.deposit(
          fixtures.other,
          depositData
        );
        expect(await fixtures.polygonAssetERC721.exists(tokenId)).to.be.true;
        expect(await fixtures.polygonAssetERC721.ownerOf(tokenId)).to.be.equal(
          fixtures.other
        );
      });
      it('other user should fail to mint', async function () {
        const tokenId = BigNumber.from('0xdada2');
        const fixtures = await setupAssetERC721Test();
        // Mint, withdraw
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
        await fixtures.polygonAssetERC721AsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await expect(
          fixtures.polygonAssetERC721.deposit(fixtures.other, depositData)
        ).to.be.reverted;
      });
      it('users can burn tokens', async function () {
        const tokenId = BigNumber.from('0xdada3');
        const fixtures = await setupAssetERC721Test();
        const assetERC721AsChildChainManager = await ethers.getContract(
          'PolygonAssetERC721',
          fixtures.childChainManager
        );
        // Mint, withdraw
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
        await fixtures.polygonAssetERC721AsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await assetERC721AsChildChainManager.deposit(
          fixtures.other,
          depositData
        );
        expect(await fixtures.polygonAssetERC721.exists(tokenId)).to.be.true;
        expect(await fixtures.polygonAssetERC721.ownerOf(tokenId)).to.be.equal(
          fixtures.other
        );

        const assetERC721AsOther = await ethers.getContract(
          'PolygonAssetERC721',
          fixtures.other
        );
        await assetERC721AsOther.withdraw(tokenId);
        expect(await fixtures.polygonAssetERC721.exists(tokenId)).to.be.false;
        await expect(
          fixtures.polygonAssetERC721.ownerOf(tokenId)
        ).to.revertedWith('ERC721: owner query for nonexistent token');
      });
      it('other users should fail to burn', async function () {
        const tokenId = BigNumber.from('0xdada4');
        const fixtures = await setupAssetERC721Test();
        const assetERC721AsChildChainManager = await ethers.getContract(
          'PolygonAssetERC721',
          fixtures.childChainManager
        );
        // Mint, withdraw
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
        await fixtures.polygonAssetERC721AsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await assetERC721AsChildChainManager.deposit(
          fixtures.other,
          depositData
        );
        await expect(
          fixtures.polygonAssetERC721.withdraw(tokenId)
        ).to.revertedWith('NOT_OWNER');
      });
      it('we use ownerOf in withdraw, it reverts when the token missing', async function () {
        const tokenId = BigNumber.from('0xdada4');
        const fixtures = await setupAssetERC721Test();
        await expect(
          fixtures.polygonAssetERC721.withdraw(tokenId)
        ).to.revertedWith('ERC721: owner query for nonexistent token');
      });
    });
  });
  it('mint, withdraw to L1, deposit in L2 again', async function () {
    const cant = 3;
    const baseId = BigNumber.from('0xdada1');
    const fixtures = await setupAssetERC721Test();
    // Mint, withdraw
    const tokenIds = [];
    for (let i = 0; i < cant; i++) {
      const tokenId = baseId.add(i);
      // Mint
      await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
        fixtures.other,
        tokenId
      );
      tokenIds.push(tokenId);
    }
    // Withdraw
    await expect(fixtures.polygonAssetERC721AsOther.withdrawBatch(tokenIds))
      .to.emit(fixtures.polygonAssetERC721AsOther, 'WithdrawnBatch')
      .withArgs(fixtures.other, tokenIds);

    // Now we can deposit again in L2
    const assetERC721AsChildChainManager = await ethers.getContract(
      'PolygonAssetERC721',
      fixtures.childChainManager
    );
    const depositData = defaultAbiCoder.encode(['uint256[]'], [tokenIds]);
    await expect(
      assetERC721AsChildChainManager.deposit(fixtures.other, depositData)
    )
      .to.emit(assetERC721AsChildChainManager, 'DepositBatch')
      .withArgs(fixtures.other, tokenIds);
    for (let i = 0; i < cant; i++) {
      const tokenId = tokenIds[i];
      expect(await fixtures.polygonAssetERC721.exists(tokenId)).to.be.true;
      expect(await fixtures.polygonAssetERC721.ownerOf(tokenId)).to.be.equal(
        fixtures.other
      );
      expect(await fixtures.polygonAssetERC721.tokenURI(tokenId)).to.be.equal(
        fixtures.baseUri + tokenId.toString() // Note: baseUri must have been set, otherwise returns ""
      );
    }
  });
  describe('metaTx', function () {
    it('withdraw', async function () {
      const tokenId = BigNumber.from('0xdada21');
      const fixtures = await setupAssetERC721Test();
      // Mint
      await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
        fixtures.other,
        tokenId
      );
      expect(await fixtures.polygonAssetERC721.exists(tokenId)).to.be.true;
      expect(await fixtures.polygonAssetERC721.ownerOf(tokenId)).to.be.equal(
        fixtures.other
      );

      // Withdraw
      const withdrawTxData = await fixtures.polygonAssetERC721AsTrustedForwarder.populateTransaction.withdraw(
        tokenId
      );
      // The msg.sender goes at the end.
      withdrawTxData.data = solidityPack(
        ['bytes', 'address'],
        [withdrawTxData.data, fixtures.other]
      );
      await fixtures.polygonAssetERC721AsTrustedForwarder.signer.sendTransaction(
        withdrawTxData
      );
      expect(await fixtures.polygonAssetERC721.withdrawnTokens(tokenId)).to.be
        .true;
      expect(await fixtures.polygonAssetERC721.exists(tokenId)).to.be.false;
      await expect(
        fixtures.polygonAssetERC721.ownerOf(tokenId)
      ).to.revertedWith('ERC721: owner query for nonexistent token');

      // Child chain manager now we can deposit again in L2 (using metatx is possible but strange!!!)
      const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
      const depositTxData = await fixtures.polygonAssetERC721AsTrustedForwarder.populateTransaction.deposit(
        fixtures.other,
        depositData
      );
      // The msg.sender goes at the end.
      depositTxData.data = solidityPack(
        ['bytes', 'address'],
        [depositTxData.data, fixtures.childChainManager]
      );
      await fixtures.polygonAssetERC721AsTrustedForwarder.signer.sendTransaction(
        depositTxData
      );
      expect(await fixtures.polygonAssetERC721.withdrawnTokens(tokenId)).to.be
        .false;
      expect(await fixtures.polygonAssetERC721.exists(tokenId)).to.be.true;
      expect(await fixtures.polygonAssetERC721.ownerOf(tokenId)).to.be.equal(
        fixtures.other
      );
    });
    it('batch withdraw', async function () {
      const cant = 3;
      const baseId = BigNumber.from('0xdada20');
      const fixtures = await setupAssetERC721Test();
      // Mint, withdraw
      const tokenIds = [];
      for (let i = 0; i < cant; i++) {
        const tokenId = baseId.add(i);
        // Mint
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
        tokenIds.push(tokenId);
      }
      // Withdraw
      const withdrawTxData = await fixtures.polygonAssetERC721AsTrustedForwarder.populateTransaction.withdrawBatch(
        tokenIds
      );
      // The msg.sender goes at the end.
      withdrawTxData.data = solidityPack(
        ['bytes', 'address'],
        [withdrawTxData.data, fixtures.other]
      );
      await expect(
        fixtures.polygonAssetERC721AsTrustedForwarder.signer.sendTransaction(
          withdrawTxData
        )
      )
        .to.emit(fixtures.polygonAssetERC721AsOther, 'WithdrawnBatch')
        .withArgs(fixtures.other, tokenIds);
    });
  });
});
