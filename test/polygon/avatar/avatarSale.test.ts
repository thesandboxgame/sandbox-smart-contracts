import {ethers} from 'hardhat';
import {expect} from 'chai';
import {solidityPack} from 'ethers/lib/utils';
import {mintSandAndApprove, setupAvatarSaleTest} from './fixtures';
import {BigNumber} from 'ethers';
import {toWei} from '../../utils';
import {avatarSaleSignature} from '../../common/signatures';

describe('AvatarSale.sol', function () {
  describe('initialization', function () {
    it('interfaces', async function () {
      const fixtures = await setupAvatarSaleTest();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IAccessControl: '0x7965db0b',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.avatarSaleAsOther.supportsInterface(i)).to.be
          .true;
      }
    });
  });
  describe('roles', function () {
    it('admin', async function () {
      const fixtures = await setupAvatarSaleTest();
      const defaultAdminRole = await fixtures.avatarSaleAsOther.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.avatarSaleAsOther.hasRole(
          defaultAdminRole,
          fixtures.adminRole
        )
      ).to.be.true;
    });

    it('signer and seller', async function () {
      const fixtures = await setupAvatarSaleTest();
      const signerRole = await fixtures.avatarSaleAsOther.SIGNER_ROLE();
      expect(
        await fixtures.avatarSaleAsOther.hasRole(signerRole, fixtures.signer)
      ).to.be.true;
      const sellerRole = await fixtures.avatarSaleAsOther.SELLER_ROLE();
      expect(
        await fixtures.avatarSaleAsOther.hasRole(sellerRole, fixtures.seller)
      ).to.be.true;
    });
  });

  describe('mint', function () {
    it('should be able to mint', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const tokenId = BigNumber.from(0x123);
      const price = toWei(5);
      await mintSandAndApprove(
        fixtures.sandToken,
        buyer,
        price,
        fixtures.avatarSaleAsOther.address
      );
      const preSeller = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.seller)
      );
      const preBuyer = BigNumber.from(
        await fixtures.sandToken.balanceOf(buyer)
      );
      const {v, r, s} = await avatarSaleSignature(
        fixtures.avatarSaleAsOther,
        fixtures.signer,
        buyer,
        [tokenId],
        fixtures.seller,
        price
      );
      await fixtures.avatarSaleAsOther.execute(
        v,
        r,
        s,
        buyer,
        [tokenId],
        fixtures.seller,
        price
      );
      expect(await fixtures.sandToken.balanceOf(fixtures.seller)).to.be.equal(
        preSeller.add(price)
      );
      expect(await fixtures.sandToken.balanceOf(buyer)).to.be.equal(
        preBuyer.sub(price)
      );
      expect(await fixtures.avatarAsAdmin.ownerOf(tokenId)).to.be.equal(buyer);
    });
    it('should fail to mint if the signature is wrong', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const tokenId = BigNumber.from(0x123);
      const price = toWei(5);
      const {v, r, s} = await avatarSaleSignature(
        fixtures.avatarSaleAsOther,
        fixtures.signer,
        buyer,
        [tokenId.add(1)],
        fixtures.seller,
        price
      );
      await expect(
        fixtures.avatarSaleAsOther.execute(
          v,
          r,
          s,
          buyer,
          [tokenId],
          fixtures.seller,
          price
        )
      ).to.be.revertedWith('Invalid signature');
    });
    it('should fail to mint if the signer is invalid', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const tokenId = BigNumber.from(0x123);
      const price = toWei(5);
      const {v, r, s} = await avatarSaleSignature(
        fixtures.avatarSaleAsOther,
        fixtures.other,
        buyer,
        [tokenId],
        fixtures.seller,
        price
      );
      await expect(
        fixtures.avatarSaleAsOther.execute(
          v,
          r,
          s,
          buyer,
          [tokenId],
          fixtures.seller,
          price
        )
      ).to.be.revertedWith('Invalid signature');
    });
    it('should fail to mint if the seller is invalid', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const tokenId = BigNumber.from(0x123);
      const price = toWei(5);
      const {v, r, s} = await avatarSaleSignature(
        fixtures.avatarSaleAsOther,
        fixtures.signer,
        buyer,
        [tokenId],
        fixtures.other,
        price
      );
      await expect(
        fixtures.avatarSaleAsOther.execute(
          v,
          r,
          s,
          buyer,
          [tokenId],
          fixtures.other,
          price
        )
      ).to.be.revertedWith('Invalid seller');
    });

    it('mint with metaTX trusted forwarder', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const tokenId = BigNumber.from(0x123);
      const price = toWei(5);
      await mintSandAndApprove(
        fixtures.sandToken,
        buyer,
        price,
        fixtures.avatarSaleAsOther.address
      );
      const preSeller = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.seller)
      );
      const preBuyer = BigNumber.from(
        await fixtures.sandToken.balanceOf(buyer)
      );
      const {v, r, s} = await avatarSaleSignature(
        fixtures.avatarSaleAsOther,
        fixtures.signer,
        buyer,
        [tokenId],
        fixtures.seller,
        price
      );

      const avatarSaleAsTrustedForwarder = await ethers.getContract(
        'PolygonAvatarSale',
        fixtures.trustedForwarder
      );

      const txData = await avatarSaleAsTrustedForwarder.populateTransaction.execute(
        v,
        r,
        s,
        buyer,
        [tokenId],
        fixtures.seller,
        price
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await avatarSaleAsTrustedForwarder.signer.sendTransaction(txData);

      expect(await fixtures.sandToken.balanceOf(fixtures.seller)).to.be.equal(
        preSeller.add(price)
      );
      expect(await fixtures.sandToken.balanceOf(buyer)).to.be.equal(
        preBuyer.sub(price)
      );
      expect(await fixtures.avatarAsAdmin.ownerOf(tokenId)).to.be.equal(buyer);
    });
  });

  describe('batch mint', function () {
    it('should be able to mint', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const cant = 10;
      await fixtures.avatarAsAdmin.setMaxMintLength(cant);
      const tokenIds = Array.from({length: cant}, () =>
        Math.floor(Math.random() * 1234567)
      );
      const prices = Array.from({length: cant}, () =>
        toWei(Math.floor(Math.random() * 1234567))
      );
      const price = prices.reduce((acc, val) => acc.add(val), toWei(0));
      await mintSandAndApprove(
        fixtures.sandToken,
        buyer,
        price.mul(cant),
        fixtures.avatarSaleAsOther.address
      );
      const preSeller = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.seller)
      );
      const preBuyer = BigNumber.from(
        await fixtures.sandToken.balanceOf(buyer)
      );
      const {v, r, s} = await avatarSaleSignature(
        fixtures.avatarSaleAsOther,
        fixtures.signer,
        buyer,
        tokenIds,
        fixtures.seller,
        price
      );
      await expect(
        fixtures.avatarSaleAsOther.execute(
          v,
          r,
          s,
          buyer,
          tokenIds,
          fixtures.seller,
          price
        )
      )
        .to.emit(fixtures.avatarSaleAsOther, 'Sold')
        .withArgs(fixtures.signer, buyer, tokenIds, fixtures.seller, price);
      expect(await fixtures.sandToken.balanceOf(fixtures.seller)).to.be.equal(
        preSeller.add(price)
      );
      expect(await fixtures.sandToken.balanceOf(buyer)).to.be.equal(
        preBuyer.sub(price)
      );
      for (const id of tokenIds) {
        expect(await fixtures.avatarAsAdmin.ownerOf(id)).to.be.equal(buyer);
      }
    });
    it('should fail to mint more than maxMintLength', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const cant = 10;
      await fixtures.avatarAsAdmin.setMaxMintLength(cant);
      const tokenIds = Array.from({length: cant + 1}, () =>
        Math.floor(Math.random() * 1234567)
      );
      const price = toWei(5);
      await mintSandAndApprove(
        fixtures.sandToken,
        buyer,
        price.mul(cant),
        fixtures.avatarSaleAsOther.address
      );
      const {v, r, s} = await avatarSaleSignature(
        fixtures.avatarSaleAsOther,
        fixtures.signer,
        buyer,
        tokenIds,
        fixtures.seller,
        price
      );
      await expect(
        fixtures.avatarSaleAsOther.execute(
          v,
          r,
          s,
          buyer,
          tokenIds,
          fixtures.seller,
          price
        )
      ).to.revertedWith('too many ids');
    });
  });

  it('should be able to mint with price == zero', async function () {
    const fixtures = await setupAvatarSaleTest();
    const buyer = fixtures.dest;
    const cant = 10;
    await fixtures.avatarAsAdmin.setMaxMintLength(cant);
    const tokenIds = Array.from({length: cant}, () =>
      Math.floor(Math.random() * 1234567)
    );
    await mintSandAndApprove(
      fixtures.sandToken,
      buyer,
      0,
      fixtures.avatarSaleAsOther.address
    );
    const {v, r, s} = await avatarSaleSignature(
      fixtures.avatarSaleAsOther,
      fixtures.signer,
      buyer,
      tokenIds,
      fixtures.seller,
      0
    );
    await expect(
      fixtures.avatarSaleAsOther.execute(
        v,
        r,
        s,
        buyer,
        tokenIds,
        fixtures.seller,
        0
      )
    )
      .to.emit(fixtures.avatarSaleAsOther, 'Sold')
      .withArgs(fixtures.signer, buyer, tokenIds, fixtures.seller, 0);
    for (const id of tokenIds) {
      expect(await fixtures.avatarAsAdmin.ownerOf(id)).to.be.equal(buyer);
    }
  });
});
