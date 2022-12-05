import {expect} from '../../chai-setup';
import {setupAssetERC721Test} from './fixtures';
import {BigNumber} from 'ethers';
describe('PolygonAssetERC721.sol differences with AssetERC721.sol', function () {
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAssetERC721Test();
        const defaultAdminRole =
          await fixtures.polygonAssetERC721.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            defaultAdminRole,
            fixtures.adminRole
          )
        ).to.be.true;
      });
    });
    describe('MINTER', function () {
      it('check initial roles', async function () {
        const fixtures = await setupAssetERC721Test();
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            fixtures.minterRole,
            fixtures.minter
          )
        ).to.be.true;
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            fixtures.minterRole,
            fixtures.other
          )
        ).to.be.false;
      });
      it('minter can mint tokens', async function () {
        const tokenId = BigNumber.from('0xdada1');
        const fixtures = await setupAssetERC721Test();
        // Mint
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
      });
      // TODO: Mint with metadata
      // TODO: Token exists
      // TODO: MINTED event

      it('other user should fail to mint', async function () {
        const tokenId = BigNumber.from('0xdada2');
        const fixtures = await setupAssetERC721Test();
        // Mint
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
        await expect(
          fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
            fixtures.other,
            tokenId
          )
        ).to.be.reverted;
      });
    });
  });
  describe('metaTx', function () {
    // Mint
    // Mint with metadata
    // Transfer
  });
});
// TODO:
// e2e flow
