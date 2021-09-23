import {expect} from '../../chai-setup';
import {setupLand} from './fixtures';

describe('PolygonLand.sol', function () {
  describe('Land <> PolygonLand: Transfer', function () {
    it('should be able to tranfer Land: L1 to L2', async function () {
      const {
        Land,
        landMinter,
        users,
        LandTunnel,
        PolygonLand,
      } = await setupLand();
      const landHolder = users[0];
      const size = 1;
      const x = 0;
      const y = 0;
      const bytes = '0x00';

      // Mint LAND on L1
      await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
      expect(await Land.balanceOf(landHolder.address)).to.be.equal(1);

      // Transfer to L1 Tunnel
      await landHolder.Land.setApprovalForAll(LandTunnel.address, true);
      await landHolder.LandTunnel.transferQuadToL2(
        landHolder.address,
        size,
        x,
        y,
        bytes
      );

      expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
      expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(1);
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(1);
    });
  });
});
