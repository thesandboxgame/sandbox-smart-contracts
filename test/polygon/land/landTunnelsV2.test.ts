import {expect} from '../../chai-setup';
import {sequentially, waitFor} from '../../utils';
import {getId, setupLandTunnelV2} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';
import {BigNumber} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import {zeroAddress} from '../../land/fixtures';

describe('PolygonLand', function () {
  describe('Land <> PolygonLand: Transfer', function () {
    describe('L1 to L2', function () {
      it('only owner can pause tunnels', async function () {
        const {users} = await setupLandTunnelV2();
        const landHolder = users[0];

        await expect(landHolder.LandTunnelV2.pause()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('only owner can set trusted forwarder', async function () {
        const {users} = await setupLandTunnelV2();
        const landHolder = users[0];

        await expect(
          landHolder.LandTunnelV2.setTrustedForwarder(users[1].address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('cannot accept randomly transferred land', async function () {
        const {
          landMinter,
          users,
          LandTunnelV2,
          getId,
        } = await setupLandTunnelV2();
        const landHolder = users[0];
        const size = 1;
        const layer = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);

        await landHolder.Land.setApprovalForAll(landMinter.address, true);
        const landId = getId(layer, x, y);
        await expect(
          landMinter.Land.transferFrom(
            landHolder.address,
            LandTunnelV2.address,
            landId
          )
        ).to.be.revertedWith('LandTunnelV2: !BRIDGING');
      });

      it('cannot accept randomly transferred lands as batch', async function () {
        const {landMinter, users, LandTunnelV2} = await setupLandTunnelV2();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);

        await expect(
          landHolder.Land.batchTransferQuad(
            landHolder.address,
            LandTunnelV2.address,
            [size],
            [0],
            [0],
            bytes
          )
        ).to.be.revertedWith('LandTunnelV2: !BRIDGING');
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupLandTunnelV2();
        const landHolder = users[0];

        await deployer.LandTunnelV2.pause();
        await expect(landHolder.LandTunnelV2.unpause()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('set Max Limit on L1', async function () {
        const {deployer} = await setupLandTunnelV2();

        expect(
          await deployer.PolygonLandTunnelV2.maxGasLimitOnL1()
        ).to.be.equal(BigNumber.from('500'));
        await deployer.PolygonLandTunnelV2.setMaxLimitOnL1(
          BigNumber.from('100000')
        );
        expect(
          await deployer.PolygonLandTunnelV2.maxGasLimitOnL1()
        ).to.be.equal(BigNumber.from('100000'));
      });

      it('cannot set Max Limit on L1 if not owner', async function () {
        const {PolygonLandTunnelV2} = await setupLandTunnelV2();
        await expect(
          PolygonLandTunnelV2.setMaxLimitOnL1(BigNumber.from('100000'))
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('set Max Allowed Quads', async function () {
        const {deployer} = await setupLandTunnelV2();

        expect(
          await deployer.PolygonLandTunnelV2.maxAllowedQuads()
        ).to.be.equal(BigNumber.from('144'));
        await deployer.PolygonLandTunnelV2.setMaxAllowedQuads(
          BigNumber.from('500')
        );
        expect(
          await deployer.PolygonLandTunnelV2.maxAllowedQuads()
        ).to.be.equal(BigNumber.from('500'));
      });

      it('cannot Max Allowed Quads if not owner', async function () {
        const {PolygonLandTunnelV2} = await setupLandTunnelV2();
        await expect(
          PolygonLandTunnelV2.setMaxAllowedQuads(100000)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('cannot set Max Allowed Quads to zero', async function () {
        const {deployer} = await setupLandTunnelV2();

        await expect(
          deployer.PolygonLandTunnelV2.setMaxAllowedQuads(0)
        ).to.be.revertedWith(
          'PolygonLandTunnelV2: max allowed value cannot be zero'
        );
      });

      it('should not be able to transfer Land when paused', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          LandTunnelV2,
          PolygonLand,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
        await deployer.LandTunnelV2.pause();

        await expect(
          landHolder.LandTunnelV2.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.LandTunnelV2.unpause();

        await waitFor(
          landHolder.LandTunnelV2.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });

      it('should be able to transfer land through tunnel if to is zeroAddress', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnelV2,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);

        await expect(
          landHolder.LandTunnelV2.batchTransferQuadToL2(
            zeroAddress,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.be.revertedWith("can't send to zero address");
      });

      it('should be able to transfer 1x1 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnelV2,
          PolygonLand,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);

        await waitFor(
          landHolder.LandTunnelV2.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 3x3 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnelV2,
          PolygonLand,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
        await landHolder.LandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 6x6 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnelV2,
          PolygonLand,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
        await landHolder.LandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 12x12 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnelV2,
          PolygonLand,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
        await landHolder.LandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 24x24 Land', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnelV2,
          PolygonLand,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
        await // expect
        landHolder.LandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        // .to.be.revertedWith('Exceeds max allowed quads');
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });

      it('should should be able to transfer multiple lands', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();
        const bytes = '0x00';
        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;

        const landHolder = users[0];
        const mintingData = [
          [6, 3],
          [30, 24],
          [30, 24],
        ];

        const numberOfLands = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await sequentially([...Array(numberOfLands).keys()], async (idx) => {
          await waitFor(
            landMinter.Land.mintQuad(
              landHolder.address,
              ...mintingData.map((x) => x[idx]),
              bytes
            )
          );
        });
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          ...mintingData,
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          numberOfTokens
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );
      });

      it('batchTransferQuadToL2 should revert if args sizes, xs, ys are not of same length', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnelV2,
        } = await setupLandTunnelV2();
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
        await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);

        await expect(
          landHolder.LandTunnelV2.batchTransferQuadToL2(
            users[0].address,
            [size],
            [x, y],
            [y],
            bytes
          )
        ).to.be.revertedWith('LandTunnelV2: invalid data');
      });

      it('batchTransferQuadToL1 should revert if args sizes, xs, ys are not of same length', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        await expect(
          landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
            deployer.address,
            [size],
            [x, y],
            [y],
            bytes
          )
        ).to.revertedWith(
          'PolygonLandTunnelV2: sizes, xs, ys must be same length'
        );
      });

      it('should revert token transfer to Land tunnel  if is not BRIDGING or not super operator', async function () {
        const {landMinter, users, LandTunnelV2} = await setupLandTunnelV2();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        const id = getId(1, 0, 0);

        await expect(
          landHolder.Land.transferFrom(
            landHolder.address,
            LandTunnelV2.address,
            id
          )
        ).to.be.revertedWith('LandTunnelV2: !BRIDGING');
      });

      it('should revert token transfer to Polygon Land tunnel  if is not BRIDGING or not super operator', async function () {
        const {
          landMinter,
          users,
          PolygonLandTunnelV2,
        } = await setupLandTunnelV2();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          size,
          x,
          y,
          bytes
        );
        const id = getId(1, 0, 0);

        await expect(
          landHolder.PolygonLand.transferFrom(
            landHolder.address,
            PolygonLandTunnelV2.address,
            id
          )
        ).to.be.revertedWith('PolygonLandTunnelV2: !BRIDGING');
      });

      it('should not on revert token transfer to Land tunnel by super operator', async function () {
        const {
          landMinter,
          users,
          LandTunnelV2,
          landAdmin,
          Land,
        } = await setupLandTunnelV2();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        await landAdmin.Land.setSuperOperator(landHolder.address, true);
        const id = getId(1, 0, 0);
        await landHolder.Land.transferFrom(
          landHolder.address,
          LandTunnelV2.address,
          id
        );

        expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
          size * size
        );
      });

      it('should not on revert token transfer to Polygon Land tunnel by super operator', async function () {
        const {
          landMinter,
          users,
          PolygonLandTunnelV2,
          deployer,
          PolygonLand,
        } = await setupLandTunnelV2();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          size,
          x,
          y,
          bytes
        );
        const id = getId(1, 0, 0);
        await deployer.PolygonLand.setSuperOperator(landHolder.address, true);
        await landHolder.PolygonLand.transferFrom(
          landHolder.address,
          PolygonLandTunnelV2.address,
          id
        );

        expect(
          await PolygonLand.balanceOf(PolygonLandTunnelV2.address)
        ).to.be.equal(size * size);
      });

      describe('Through meta transaction', function () {
        it('should be able to transfer 1x1 Land', async function () {
          const {
            Land,
            landMinter,
            users,
            LandTunnelV2,
            PolygonLand,
            trustedForwarder,
          } = await setupLandTunnelV2();
          const landHolder = users[0];
          const size = 1;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;
          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
          const {to, data} = await landHolder.LandTunnelV2.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](landHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '1000000'
          );
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
          expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
            plotCount
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
        });
        it('should be able to transfer 3x3 Land', async function () {
          const {
            Land,
            landMinter,
            users,
            LandTunnelV2,
            PolygonLand,
            trustedForwarder,
          } = await setupLandTunnelV2();
          const landHolder = users[0];
          const size = 3;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
          const {to, data} = await landHolder.LandTunnelV2.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](landHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '1000000'
          );
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
          expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
            plotCount
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
        });
        it('should be able to transfer 6x6 Land', async function () {
          const {
            Land,
            landMinter,
            users,
            LandTunnelV2,
            PolygonLand,
            trustedForwarder,
          } = await setupLandTunnelV2();
          const landHolder = users[0];
          const size = 6;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);
          const {to, data} = await landHolder.LandTunnelV2.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](landHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '10000000'
          );
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
          expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
            plotCount
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
        });
        it('should be able to transfer 12x12 Land', async function () {
          const {
            Land,
            landMinter,
            users,
            LandTunnelV2,
            PolygonLand,
            trustedForwarder,
          } = await setupLandTunnelV2();
          const landHolder = users[0];
          const size = 12;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(LandTunnelV2.address, true);

          const {to, data} = await landHolder.LandTunnelV2.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](landHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '1000000000'
          );

          expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
          expect(await Land.balanceOf(LandTunnelV2.address)).to.be.equal(
            plotCount
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
        });
        it('should should be able to transfer multiple lands meta', async function () {
          const {
            deployer,
            Land,
            landMinter,
            users,
            MockLandTunnelV2,
            PolygonLand,
            MockPolygonLandTunnelV2,
            trustedForwarder,
          } = await setupLandTunnelV2();
          const bytes = '0x00';
          // Set Mock PolygonLandTunnel in PolygonLand
          await deployer.PolygonLand.setMinter(
            MockPolygonLandTunnelV2.address,
            true
          );
          expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
            .be.true;
          const landHolder = users[0];
          const mintingData = [
            [6, 3],
            [0, 24],
            [0, 24],
          ];
          const numberOfLands = mintingData[0].length;
          const numberOfTokens = mintingData[0]
            .map((elem) => elem * elem)
            .reduce((a, b) => a + b, 0);
          await sequentially([...Array(numberOfLands).keys()], (idx) =>
            waitFor(
              landMinter.Land.mintQuad(
                landHolder.address,
                ...mintingData.map((x) => x[idx]),
                bytes
              )
            )
          );
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            numberOfTokens
          );
          // Transfer to L1 Tunnel
          const tx = await landHolder.Land.setApprovalForAll(
            MockLandTunnelV2.address,
            true
          );
          tx.wait();
          const {
            to,
            data,
          } = await landHolder.MockLandTunnelV2.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](landHolder.address, ...mintingData, bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '2000000'
          );
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
          expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
            numberOfTokens
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            numberOfTokens
          );
        });
      });
    });
    describe('L2 to L1', function () {
      it('only owner can pause tunnels', async function () {
        const {users} = await setupLandTunnelV2();
        const landHolder = users[0];

        await expect(
          landHolder.MockPolygonLandTunnelV2.pause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupLandTunnelV2();
        const landHolder = users[0];

        await deployer.LandTunnelV2.pause();
        await expect(
          landHolder.MockPolygonLandTunnelV2.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('only owner can set trusted forwarder', async function () {
        const {users} = await setupLandTunnelV2();
        const landHolder = users[0];

        await expect(
          landHolder.PolygonLandTunnelV2.setTrustedForwarder(users[1].address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('cannot accept randomly transferred land', async function () {
        const {
          deployer,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const layer = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        const landId = getId(layer, x, y);

        await expect(
          landHolder.PolygonLand.transferFrom(
            landHolder.address,
            MockPolygonLandTunnelV2.address,
            landId
          )
        ).to.be.revertedWith('PolygonLandTunnelV2: !BRIDGING');
      });
      it('cannot accept randomly transferred lands as batch', async function () {
        const {
          deployer,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        await expect(
          landHolder.PolygonLand.batchTransferQuad(
            landHolder.address,
            MockPolygonLandTunnelV2.address,
            [size],
            [0],
            [0],
            bytes
          )
        ).to.be.revertedWith('PolygonLandTunnelV2: !BRIDGING');
      });
      it('should not be able to transfer Land when paused', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        await deployer.MockPolygonLandTunnelV2.pause();
        await expect(
          landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.MockPolygonLandTunnelV2.unpause();

        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer land through tunnel if to is zeroAddress', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        await expect(
          landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
            zeroAddress,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.revertedWith("can't send to zero address");
      });

      it('should be able to transfer 1x1 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 12x12 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should not be able to transfer 2, 12x12 Land at once', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const bytes = '0x00';

        const landHolder = users[0];
        const size_1 = 12;
        const x_1 = 0;
        const y_1 = 0;

        const size_2 = 12;
        const x_2 = 12;
        const y_2 = 12;
        const plotCount = size_1 * size_1 + size_1 * size_2;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(
          landHolder.address,
          size_1,
          x_1,
          y_1,
          bytes
        );
        await landMinter.Land.mintQuad(
          landHolder.address,
          size_2,
          x_2,
          y_2,
          bytes
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size_1],
          [x_1],
          [y_1],
          bytes
        );
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size_2],
          [x_2],
          [y_2],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        await expect(
          landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
            landHolder.address,
            [size_1, size_2],
            [x_1, x_2],
            [y_1, y_2],
            bytes
          )
        ).to.be.revertedWith('Exceeds max allowed quads.');
      });

      it('should be able to transfer 3x3 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 6x6 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should should be able to transfer multiple lands', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();
        const bytes = '0x00';
        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;

        const landHolder = users[0];
        const mintingData = [
          [6, 3],
          [30, 24],
          [30, 24],
        ];

        const numberOfLands = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await sequentially([...Array(numberOfLands).keys()], (idx) =>
          waitFor(
            landMinter.Land.mintQuad(
              landHolder.address,
              ...mintingData.map((x) => x[idx]),
              bytes
            )
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          ...mintingData,
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          numberOfTokens
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          ...mintingData,
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, ...mintingData, bytes]
          )
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should not be able to transfer if exceeds limit', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
        } = await setupLandTunnelV2();
        const bytes = '0x00';

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;

        const landHolder = users[0];
        const mintingData = [
          [1, 1],
          [0, 240],
          [0, 240],
        ];

        const numberOfLands = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await sequentially([...Array(numberOfLands).keys()], (idx) =>
          waitFor(
            landMinter.Land.mintQuad(
              landHolder.address,
              ...mintingData.map((x) => x[idx]),
              bytes
            )
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          ...mintingData,
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          numberOfTokens
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L2 Tunnel
        await deployer.MockPolygonLandTunnelV2.setLimit(1, 400);

        // Check if limit is set
        expect(await MockPolygonLandTunnelV2.maxGasLimitOnL1()).to.eq(500);
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        await expect(
          landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
            landHolder.address,
            ...mintingData,
            bytes
          )
        ).to.be.revertedWith('Exceeds gas limit on L1.');
      });
    });
    describe('Through meta Tx', function () {
      it('should be able to transfer 1x1 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
          trustedForwarder,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnelV2.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](landHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '1000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 3x3 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
          trustedForwarder,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnelV2.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](landHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '1000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 6x6 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
          trustedForwarder,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnelV2.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](landHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '1000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 12x12 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
          trustedForwarder,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnelV2.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnelV2.address)).to
          .be.true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnelV2.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](landHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '1000000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });
    });
    describe('Minting on layer 2', function () {
      it('should be able to transfer 12x12 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          PolygonLand,
          MockPolygonLandTunnelV2,
          MockLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L2
        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          size,
          x,
          y,
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(false);

        // Transfer to L1 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);
      });

      it('should be able to transfer 6x6 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          PolygonLand,
          MockPolygonLandTunnelV2,
          MockLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L2
        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          size,
          x,
          y,
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(false);

        // Transfer to L1 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);
      });

      it('should be able to transfer 3x3 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          PolygonLand,
          MockPolygonLandTunnelV2,
          MockLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L2
        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          size,
          x,
          y,
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(false);

        // Transfer to L1 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);
      });

      it('should be able to transfer 1x1 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          PolygonLand,
          MockPolygonLandTunnelV2,
          MockLandTunnelV2,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L2
        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          size,
          x,
          y,
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(false);

        // Transfer to L1 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.exists(size, x, y)).to.be.equal(true);
      });
    });
    describe('Minting quad on layer 2 with child quad minted on layer 1', function () {
      it('should be able to transfer 12x12 Land with child quads already minted', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const mintedLandIds = [];
        const sizes = [];
        const xs = [];
        const ys = [];

        // Minting  1x1 land on L1.

        for (let i = 0; i < 12; i = i + 6) {
          for (let j = 0; j < 12; j = j + 6) {
            if (i == 6 && j == 6) break;
            await landMinter.Land.mintQuad(landHolder.address, 6, i, j, bytes);
            mintedLandIds.push(getId(3, i, j));
            sizes.push(6);
            xs.push(i);
            ys.push(j);
          }
        }

        for (let i = 6; i < 12; i = i + 3) {
          for (let j = 6; j < 12; j = j + 3) {
            if (i == 9 && j == 9) break;
            await landMinter.Land.mintQuad(landHolder.address, 3, i, j, bytes);
            mintedLandIds.push(getId(2, i, j));
            sizes.push(3);
            xs.push(i);
            ys.push(j);
          }
        }

        for (let i = 9; i < 12; i++) {
          for (let j = 9; j < 12; j++) {
            if (i == 11 && j == 11) break;
            await landMinter.Land.mintQuad(landHolder.address, 1, i, j, bytes);
            mintedLandIds.push(getId(1, i, j));
            sizes.push(1);
            xs.push(i);
            ys.push(j);
          }
        }

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(143);
        expect(await Land.exists(12, x, y)).to.be.equal(false);

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        const tx = await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          sizes,
          xs,
          ys,
          bytes
        );
        await tx.wait();

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            MockLandTunnelV2.address
          );
        }
        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          1,
          11,
          11,
          bytes
        );
        mintedLandIds.push(getId(1, 11, 11));

        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const tx2 = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [12],
          [0],
          [0],
          bytes
        );
        await tx2.wait();
        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();
        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [12], [x], [y], bytes]
          )
        );
        await tnx.wait();

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(144);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }
        expect(await Land.ownerOf(getId(4, x, y))).to.be.equal(
          landHolder.address
        );
        expect(await Land.exists(12, x, y)).to.be.equal(true);
      });
      it('should be able to transfer 12x12 Land with child quads already minted : worst case', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const mintedLandIds = [];
        const sizes = [];
        const xs = [];
        const ys = [];

        // Minting all the 1x1 land on L1 in an 12x12 Land quad except 1 for the worst case
        for (let i = 0; i < 12; i = i + 1) {
          for (let j = 0; j < 12; j = j + 1) {
            if (i == 11 && j == 11) break;
            await landMinter.Land.mintQuad(landHolder.address, 1, i, j, bytes);
            mintedLandIds.push(getId(1, i, j));
            sizes.push(1);
            xs.push(i);
            ys.push(j);
          }
        }

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(143);
        expect(await Land.exists(12, x, y)).to.be.equal(false);
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        const tx = await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          sizes,
          xs,
          ys,
          bytes
        );
        await tx.wait();

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            MockLandTunnelV2.address
          );
        }

        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          1,
          11,
          11,
          bytes
        );
        mintedLandIds.push(getId(1, 11, 11));

        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const tx2 = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [12],
          [0],
          [0],
          bytes
        );
        await tx2.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [12], [x], [y], bytes]
          )
        );
        await tnx.wait();

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(144);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }
        expect(await Land.ownerOf(getId(4, x, y))).to.be.equal(
          landHolder.address
        );
        expect(await Land.exists(12, x, y)).to.be.equal(true);
      });
      it('should be able to transfer 6x6 Land with child quads already minted', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const mintedLandIds = [];

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, 1, 0, 0, bytes);
        mintedLandIds.push(getId(1, 0, 0));

        await landMinter.Land.mintQuad(landHolder.address, 3, 3, 0, bytes);
        mintedLandIds.push(getId(2, 3, 0));

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(10);
        expect(await Land.exists(6, x, y)).to.be.equal(false);
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        const tx = await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [1, 3],
          [0, 3],
          [0, 0],
          bytes
        );
        await tx.wait();

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            MockLandTunnelV2.address
          );
        }

        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (!(i == 0 && j == 0)) {
              await landMinter.PolygonLand.mintQuad(
                landHolder.address,
                1,
                i,
                j,
                bytes
              );
              mintedLandIds.push(getId(1, i, j));
            }
          }
        }

        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          3,
          0,
          3,
          bytes
        );
        mintedLandIds.push(getId(2, 0, 3));

        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          3,
          3,
          3,
          bytes
        );
        mintedLandIds.push(getId(2, 3, 3));

        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const tx2 = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [6],
          [0],
          [0],
          bytes
        );
        await tx2.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [6], [x], [y], bytes]
          )
        );
        await tnx.wait();

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(36);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await Land.exists(6, x, y)).to.be.equal(true);
        expect(await Land.ownerOf(getId(3, x, y))).to.be.equal(
          landHolder.address
        );

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }
      });

      it('should be able to transfer 3x3 Land with child quads already minted', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, 1, 0, 0, bytes);

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(1);
        expect(await Land.exists(3, x, y)).to.be.equal(false);

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [1],
          [0],
          [0],
          bytes
        );

        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (!(i == 0 && j == 0)) {
              await landMinter.PolygonLand.mintQuad(
                landHolder.address,
                1,
                i,
                j,
                bytes
              );
            }
          }
        }

        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const tx2 = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [3],
          [0],
          [0],
          bytes
        );
        await tx2.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [3], [x], [y], bytes]
          )
        );
        await tnx.wait();

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(9);
        expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(0);
        expect(await Land.exists(3, x, y)).to.be.equal(true);
        expect(await Land.ownerOf(getId(2, x, y))).to.be.equal(
          landHolder.address
        );
      });
    });

    describe('Minting quad on layer 1 with child quad minted on layer 2', function () {
      it('should be able to transfer 12x12 Land with child quads already minted', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnelV2,
          PolygonLand,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const mintedLandIds = [];
        const sizes = [];
        const xs = [];
        const ys = [];

        for (let i = 0; i < 12; i = i + 6) {
          for (let j = 0; j < 12; j = j + 6) {
            if (i == 6 && j == 6) break;
            await landMinter.PolygonLand.mintQuad(
              landHolder.address,
              6,
              i,
              j,
              bytes
            );
            mintedLandIds.push(getId(3, i, j));
            sizes.push(6);
            xs.push(i);
            ys.push(j);
          }
        }

        for (let i = 6; i < 12; i = i + 3) {
          for (let j = 6; j < 12; j = j + 3) {
            if (i == 9 && j == 9) break;
            await landMinter.PolygonLand.mintQuad(
              landHolder.address,
              3,
              i,
              j,
              bytes
            );
            mintedLandIds.push(getId(2, i, j));
            sizes.push(3);
            xs.push(i);
            ys.push(j);
          }
        }

        for (let i = 9; i < 12; i++) {
          for (let j = 9; j < 12; j++) {
            if (i == 11 && j == 11) break;
            await landMinter.PolygonLand.mintQuad(
              landHolder.address,
              1,
              i,
              j,
              bytes
            );
            mintedLandIds.push(getId(1, i, j));
            sizes.push(1);
            xs.push(i);
            ys.push(j);
          }
        }

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          143
        );
        expect(await PolygonLand.exists(12, x, y)).to.be.equal(false);

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await PolygonLand.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          sizes,
          xs,
          ys,
          bytes
        );
        await tx.wait();

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await PolygonLand.ownerOf(mintedLandIds[i])).to.be.equal(
            MockPolygonLandTunnelV2.address
          );
        }

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();
        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, sizes, xs, ys, bytes]
          )
        );
        await tnx.wait();

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(143);
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landMinter.Land.mintQuad(landHolder.address, 1, 11, 11, bytes);

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [12],
          [0],
          [0],
          bytes
        );
        expect(
          await PolygonLand.balanceOf(MockPolygonLandTunnelV2.address)
        ).to.be.equal(0);
        expect(await PolygonLand.ownerOf(getId(4, x, y))).to.be.equal(
          landHolder.address
        );
        expect(await PolygonLand.exists(12, x, y)).to.be.equal(true);
      });
      it('should be able to transfer 12x12 Land with child quads already minted : worst case', async function () {
        const {
          deployer,
          Land,
          PolygonLand,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const mintedLandIds = [];
        const sizes = [];
        const xs = [];
        const ys = [];

        // Minting all the 1x1 land on L1 in an 12x12 Land quad except 1 for the worst case
        for (let i = 0; i < 12; i = i + 1) {
          for (let j = 0; j < 12; j = j + 1) {
            if (i == 11 && j == 11) break;
            await landMinter.PolygonLand.mintQuad(
              landHolder.address,
              1,
              i,
              j,
              bytes
            );
            mintedLandIds.push(getId(1, i, j));
            sizes.push(1);
            xs.push(i);
            ys.push(j);
          }
        }

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          143
        );
        expect(await PolygonLand.exists(12, x, y)).to.be.equal(false);
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await PolygonLand.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        for (let i = 0; i <= 100; i += 50) {
          const endIndex = i == 100 ? i + 43 : i + 50;
          const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
            landHolder.address,
            sizes.slice(i, endIndex),
            xs.slice(i, endIndex),
            ys.slice(i, endIndex),
            bytes
          );
          await tx.wait();
        }
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await PolygonLand.ownerOf(mintedLandIds[i])).to.be.equal(
            MockPolygonLandTunnelV2.address
          );
        }

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();
        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, sizes, xs, ys, bytes]
          )
        );
        await tnx.wait();

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landMinter.Land.mintQuad(landHolder.address, 1, 11, 11, bytes);
        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);

        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [12],
          [0],
          [0],
          bytes
        );

        expect(
          await PolygonLand.balanceOf(MockPolygonLandTunnelV2.address)
        ).to.be.equal(0);

        expect(await PolygonLand.ownerOf(getId(4, x, y))).to.be.equal(
          landHolder.address
        );
        expect(await PolygonLand.exists(12, x, y)).to.be.equal(true);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          144
        );
      });
      it('should be able to transfer 6x6 Land with child quads already minted', async function () {
        const {
          deployer,
          Land,
          PolygonLand,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const mintedLandIds = [];

        // Mint LAND on L1
        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          1,
          0,
          0,
          bytes
        );
        mintedLandIds.push(getId(1, 0, 0));

        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          3,
          3,
          0,
          bytes
        );
        mintedLandIds.push(getId(2, 3, 0));

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(10);
        expect(await PolygonLand.exists(6, x, y)).to.be.equal(false);
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await PolygonLand.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );

        const tx = await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [1, 3],
          [0, 3],
          [0, 0],
          bytes
        );
        await tx.wait();

        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await PolygonLand.ownerOf(mintedLandIds[i])).to.be.equal(
            MockPolygonLandTunnelV2.address
          );
        }

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [1, 3], [0, 3], [0, 0], bytes]
          )
        );
        await tnx.wait();
        for (let i = 0; i < mintedLandIds.length; i++) {
          expect(await Land.ownerOf(mintedLandIds[i])).to.be.equal(
            landHolder.address
          );
        }

        for (let i = 0; i < 3; i = i + 1) {
          for (let j = 0; j < 3; j = j + 1) {
            if (!(i == 0 && j == 0)) {
              await landMinter.Land.mintQuad(
                landHolder.address,
                1,
                i,
                j,
                bytes
              );
            }
          }
        }
        await landMinter.Land.mintQuad(landHolder.address, 3, 0, 3, bytes);
        await landMinter.Land.mintQuad(landHolder.address, 3, 3, 3, bytes);

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [6],
          [0],
          [0],
          bytes
        );

        expect(
          await PolygonLand.balanceOf(MockPolygonLandTunnelV2.address)
        ).to.be.equal(0);

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(36);
        expect(await PolygonLand.exists(6, x, y)).to.be.equal(true);
        expect(await PolygonLand.ownerOf(getId(3, x, y))).to.be.equal(
          landHolder.address
        );
      });

      it('should be able to transfer 3x3 Land with child quads already minted', async function () {
        const {
          deployer,
          PolygonLand,
          landMinter,
          users,
          MockLandTunnelV2,
          MockPolygonLandTunnelV2,
          getId,
        } = await setupLandTunnelV2();

        const landHolder = users[0];
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        // Mint LAND on L1
        await landMinter.PolygonLand.mintQuad(
          landHolder.address,
          1,
          0,
          0,
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(1);
        expect(await PolygonLand.exists(3, x, y)).to.be.equal(false);

        // Transfer to L1 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnelV2.address,
          true
        );
        await landHolder.MockPolygonLandTunnelV2.batchTransferQuadToL1(
          landHolder.address,
          [1],
          [0],
          [0],
          bytes
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        const tnx = await deployer.MockLandTunnelV2.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [1], [0], [0], bytes]
          )
        );
        await tnx.wait();

        for (let i = 0; i < 3; i = i + 1) {
          for (let j = 0; j < 3; j = j + 1) {
            if (!(i == 0 && j == 0)) {
              await landMinter.Land.mintQuad(
                landHolder.address,
                1,
                i,
                j,
                bytes
              );
            }
          }
        }

        await landHolder.Land.setApprovalForAll(MockLandTunnelV2.address, true);
        await landHolder.MockLandTunnelV2.batchTransferQuadToL2(
          landHolder.address,
          [3],
          [0],
          [0],
          bytes
        );
        expect(
          await PolygonLand.balanceOf(MockPolygonLandTunnelV2.address)
        ).to.be.equal(0);

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(9);
        expect(await PolygonLand.exists(3, x, y)).to.be.equal(true);
        expect(await PolygonLand.ownerOf(getId(2, x, y))).to.be.equal(
          landHolder.address
        );
      });
    });
  });
});
