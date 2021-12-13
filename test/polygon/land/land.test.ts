import {expect} from '../../chai-setup';
import {setupLand} from './fixtures';

describe('PolygonLand.sol', function () {
  describe('Land <> PolygonLand: Transfer', function () {
    describe('L1 to L2', function () {
      it('should be able to tranfer 1x1 Land', async function () {
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
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

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
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to tranfer 3x3 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnel,
          PolygonLand,
        } = await setupLand();
        const landHolder = users[0];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

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
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to tranfer 6x6 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnel,
          PolygonLand,
        } = await setupLand();
        const landHolder = users[0];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

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
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to tranfer 12x12 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnel,
          PolygonLand,
        } = await setupLand();
        const landHolder = users[0];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

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
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to tranfer 24x24 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnel,
          PolygonLand,
        } = await setupLand();
        const landHolder = users[0];
        const size = 24;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

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
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
    });
    describe('L2 to L1', function () {
      it('should be able to tranfer 1x1 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          LandTunnel,
          PolygonLand,
          PolygonLandTunnel,
          CheckpointManager,
        } = await setupLand();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

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
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          PolygonLandTunnel.address,
          true
        );
        const tx = await landHolder.PolygonLandTunnel.transferQuadToL1(
          landHolder.address,
          size,
          x,
          y,
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1

        await deployer.LandTunnel.receiveMessage({});
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });
    });
  });
});
