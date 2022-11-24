import {setupTestPolygonKYCToken} from './fixtures';
import {expect} from '../../chai-setup';
import {zeroAddress} from '../../land/fixtures';

describe('PolygonKYCToken', function () {
  describe('TestPolygonKYCToken', function () {
    describe('roles are correctly set up in deployment script', function () {
      it('default admin role was granted to kyc admin at initialization', async function () {
        const {
          PolygonKYCToken,
          kycAdmin,
          defaultAdminRole,
        } = await setupTestPolygonKYCToken();
        expect(await PolygonKYCToken.hasRole(defaultAdminRole, kycAdmin)).to.be
          .true;
      });
      it('minter role was granted to backendKYCWallet at initialization', async function () {
        const {
          PolygonKYCToken,
          minterRole,
          backendKYCWallet,
        } = await setupTestPolygonKYCToken();
        expect(await PolygonKYCToken.hasRole(minterRole, backendKYCWallet)).to
          .be.true;
      });
      it('burner role was granted to kyc admin at initialization', async function () {
        const {
          PolygonKYCToken,
          burnerRole,
          kycAdmin,
        } = await setupTestPolygonKYCToken();
        expect(await PolygonKYCToken.hasRole(burnerRole, kycAdmin)).to.be.true;
      });
    });
    describe('mint', function () {
      it('minter role can mint', async function () {
        const {
          contractAsMinterRole,
          other,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();
        await expect(
          contractAsMinterRole['mint(address,uint256)'](other.address, 10)
        ).to.not.be.reverted;
        const balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(1);
      });
      it('minter role can mint with data', async function () {
        const {
          contractAsMinterRole,
          other,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();
        await expect(
          contractAsMinterRole['mint(address,uint256,bytes)'](
            other.address,
            10,
            '0x'
          )
        ).to.not.be.reverted;
        const balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(1);
      });
      it('if not granted minter role cannot mint', async function () {
        const {other} = await setupTestPolygonKYCToken();
        await expect(
          other.PolygonKYCToken['mint(address,uint256)'](other.address, 10)
        ).to.be.revertedWith(
          `AccessControl: account ${other.address.toLowerCase()} is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`
        );
      });
      it('default admin role cannot mint', async function () {
        const {
          contractAsDefaultAdmin,
          other,
          kycAdmin,
        } = await setupTestPolygonKYCToken();
        await expect(
          contractAsDefaultAdmin['mint(address,uint256)'](other.address, 10)
        ).to.be.revertedWith(
          `AccessControl: account ${kycAdmin.toLowerCase()} is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`
        );
      });
      it('cannot mint to the same address twice', async function () {
        const {contractAsMinterRole, other} = await setupTestPolygonKYCToken();
        await expect(
          contractAsMinterRole['mint(address,uint256)'](other.address, 10)
        ).to.not.be.reverted;
        await expect(
          contractAsMinterRole['mint(address,uint256)'](other.address, 10)
        ).to.be.revertedWith('KYCERC721_ISSUED');
      });
      it('cannot mint to the same address twice with data', async function () {
        const {contractAsMinterRole, other} = await setupTestPolygonKYCToken();
        await expect(
          contractAsMinterRole['mint(address,uint256,bytes)'](
            other.address,
            10,
            '0x'
          )
        ).to.not.be.reverted;
        await expect(
          contractAsMinterRole['mint(address,uint256,bytes)'](
            other.address,
            10,
            '0x'
          )
        ).to.be.revertedWith('KYCERC721_ISSUED');
      });
      it('can mint to the same address twice if the first token has been burned and balanceOf is zero', async function () {
        const {
          contractAsMinterRole,
          other,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();
        await expect(
          contractAsMinterRole['mint(address,uint256)'](other.address, 10)
        ).to.not.be.reverted;
        let balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(1);
        await other.PolygonKYCToken.burn(10);
        balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(0);
        await expect(
          contractAsMinterRole['mint(address,uint256)'](other.address, 10)
        ).to.not.be.reverted;
        balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(1);
      });
    });
    describe('burn', function () {
      it('a user can burn their own token', async function () {
        const {contractAsMinterRole, other} = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await expect(other.PolygonKYCToken.burn(10)).to.not.be.reverted;
      });
      it('a user cannot burn a token belonging to another', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await contractAsMinterRole['mint(address,uint256)'](otherB.address, 5);
        await expect(other.PolygonKYCToken.burn(5)).to.be.revertedWith(
          'NOT_OWNER'
        );
      });
    });
    describe('burnFrom', function () {
      it('burner role can burn a token belonging to another', async function () {
        const {
          contractAsMinterRole,
          contractAsBurnerRole,
          other,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await expect(contractAsBurnerRole.burnFrom(other.address, 10)).to.not.be
          .reverted;
      });
      it('if not burner role cannot burn a token belonging to another', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](otherB.address, 5);
        await expect(
          other.PolygonKYCToken.burnFrom(otherB.address, 5)
        ).to.be.revertedWith(
          `AccessControl: account ${other.address.toLowerCase()} is missing role 0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848`
        );
      });
      it('default admin can burn a token belonging to another', async function () {
        const {
          contractAsDefaultAdmin,
          contractAsMinterRole,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](otherB.address, 5);
        await expect(contractAsDefaultAdmin.burnFrom(otherB.address, 5)).to.not
          .be.reverted;
      });
    });
    describe('transfer', function () {
      it('mint emits Transfer event', async function () {
        const {contractAsMinterRole, other} = await setupTestPolygonKYCToken();
        const tx = await contractAsMinterRole['mint(address,uint256)'](
          other.address,
          10
        );
        const receipt = await tx.wait();
        expect(receipt.events.length).to.be.equal(1);
        expect(receipt.events[0].event).to.be.equal('Transfer');
        expect(receipt.events[0].args[0]).to.be.equal(zeroAddress);
        expect(receipt.events[0].args[1]).to.be.equal(other.address);
        expect(receipt.events[0].args[2]).to.be.equal(10);
      });
      it('burn emits Transfer event', async function () {
        const {contractAsMinterRole, other} = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        const tx = await other.PolygonKYCToken.burn(10);
        const receipt = await tx.wait();
        expect(receipt.events.length).to.be.equal(2);
        expect(receipt.events[0].event).to.be.equal('Approval');
        expect(receipt.events[1].event).to.be.equal('Transfer');
        expect(receipt.events[1].args[0]).to.be.equal(other.address);
        expect(receipt.events[1].args[1]).to.be.equal(zeroAddress);
        expect(receipt.events[1].args[2]).to.be.equal(10);
      });
      it('burnFrom emits Transfer event', async function () {
        const {
          contractAsMinterRole,
          contractAsBurnerRole,
          other,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        const tx = await contractAsBurnerRole.burnFrom(other.address, 10);
        const receipt = await tx.wait();
        expect(receipt.events.length).to.be.equal(2);
        expect(receipt.events[0].event).to.be.equal('Approval');
        expect(receipt.events[1].event).to.be.equal('Transfer');
        expect(receipt.events[1].args[0]).to.be.equal(other.address);
        expect(receipt.events[1].args[1]).to.be.equal(zeroAddress);
        expect(receipt.events[1].args[2]).to.be.equal(10);
      });
      it('user cannot transfer their token with safeTransferFrom', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await expect(
          other.PolygonKYCToken['safeTransferFrom(address,address,uint256)'](
            other.address,
            otherB.address,
            10
          )
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('user cannot transfer their token with safeTransferFrom with data', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await expect(
          other.PolygonKYCToken[
            'safeTransferFrom(address,address,uint256,bytes)'
          ](other.address, otherB.address, 10, '0x')
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('user cannot transfer their token with transferFrom', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await expect(
          other.PolygonKYCToken.transferFrom(other.address, otherB.address, 10)
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('approved operator cannot transfer a token with transferFrom', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await other.PolygonKYCToken.setApprovalForAll(otherB.address, true);
        await expect(
          otherB.PolygonKYCToken.transferFrom(other.address, otherB.address, 10)
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('approved operator cannot transfer a token with safeTransferFrom', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await other.PolygonKYCToken.setApprovalForAll(otherB.address, true);
        await expect(
          otherB.PolygonKYCToken['safeTransferFrom(address,address,uint256)'](
            other.address,
            otherB.address,
            10
          )
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('approved operator cannot transfer a token with safeTransferFrom with data', async function () {
        const {
          contractAsMinterRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](other.address, 10);
        await other.PolygonKYCToken.setApprovalForAll(otherB.address, true);
        await expect(
          otherB.PolygonKYCToken[
            'safeTransferFrom(address,address,uint256,bytes)'
          ](other.address, otherB.address, 10, '0x')
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('admin cannot transfer a token', async function () {
        const {
          contractAsMinterRole,
          otherB,
          kycAdmin,
          contractAsDefaultAdmin,
        } = await setupTestPolygonKYCToken();
        await contractAsMinterRole['mint(address,uint256)'](kycAdmin, 10);
        await expect(
          contractAsDefaultAdmin.transferFrom(kycAdmin, otherB.address, 10)
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
    });
    describe('tokenURI', function () {
      it('can view tokenURI for a token that has been minted', async function () {
        const {
          contractAsMinterRole,
          other,
          PolygonKYCToken,
          testURI,
        } = await setupTestPolygonKYCToken();
        const tokenID = 10;
        await contractAsMinterRole['mint(address,uint256)'](
          other.address,
          tokenID
        );
        const uri = await PolygonKYCToken.tokenURI(10);
        expect(uri).to.be.equal(`${testURI}${tokenID}`);
      });
      it('cannot view token uri if token id does not exist', async function () {
        const {PolygonKYCToken} = await setupTestPolygonKYCToken();
        await expect(PolygonKYCToken.tokenURI(10)).to.be.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
      });
    });
    describe('baseURI', function () {
      it('base token uri was set at initialization', async function () {
        const {PolygonKYCToken, testURI} = await setupTestPolygonKYCToken();
        const uri = await PolygonKYCToken.baseURI();
        expect(uri).to.be.equal(testURI);
      });
      it('default admin role can set a new base token uri', async function () {
        const {
          PolygonKYCToken,
          contractAsDefaultAdmin,
        } = await setupTestPolygonKYCToken();
        const newURI = 'newURI/';
        await expect(contractAsDefaultAdmin.setBaseURI(newURI)).to.not.be
          .reverted;
        const uri = await PolygonKYCToken.baseURI();
        expect(uri).to.be.equal(newURI);
      });
      it('if not granted default admin role cannot set base token uri', async function () {
        const {other} = await setupTestPolygonKYCToken();
        const newURI = 'newURI/';
        await expect(
          other.PolygonKYCToken.setBaseURI(newURI)
        ).to.be.revertedWith(
          `AccessControl: account ${other.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
        );
      });
    });
  });
});
