import {expect} from '../../chai-setup';
import {sequentially, waitFor} from '../../utils';
import {setupLand} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';
import {BigNumber} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';

describe('PolygonLand', function () {
  describe('Land <> PolygonLand: Transfer', function () {
    describe('L1 to L2', function () {
      it('only owner can pause tunnels', async function () {
        const {users} = await setupLand();
        const landHolder = users[0];

        await expect(landHolder.LandTunnel.pause()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('cannot accept randomly transferred land', async function () {
        const {landMinter, users, LandTunnel} = await setupLand();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);

        await expect(
          landHolder.Land.transferQuad(
            landHolder.address,
            LandTunnel.address,
            size,
            0,
            0,
            bytes
          )
        ).to.be.revertedWith('LandTunnel: !BRIDGING');
      });

      it('cannot accept randomly transferred lands as batch', async function () {
        const {landMinter, users, LandTunnel} = await setupLand();
        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);

        await expect(
          landHolder.Land.batchTransferQuad(
            landHolder.address,
            LandTunnel.address,
            [size],
            [0],
            [0],
            bytes
          )
        ).to.be.revertedWith('LandTunnel: !BRIDGING');
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupLand();
        const landHolder = users[0];

        await deployer.LandTunnel.pause();
        await expect(landHolder.LandTunnel.unpause()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('set Max Limit on L1', async function () {
        const {deployer} = await setupLand();

        expect(await deployer.PolygonLandTunnel.maxGasLimitOnL1()).to.be.equal(
          BigNumber.from('500')
        );
        await deployer.PolygonLandTunnel.setMaxLimitOnL1(
          BigNumber.from('100000')
        );
        expect(await deployer.PolygonLandTunnel.maxGasLimitOnL1()).to.be.equal(
          BigNumber.from('100000')
        );
      });

      it('cannot set Max Limit on L1 if not owner', async function () {
        const {PolygonLandTunnel} = await setupLand();
        await expect(
          PolygonLandTunnel.setMaxLimitOnL1(BigNumber.from('100000'))
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('set Max Allowed Quads', async function () {
        const {deployer} = await setupLand();

        expect(await deployer.PolygonLandTunnel.maxAllowedQuads()).to.be.equal(
          BigNumber.from('144')
        );
        await deployer.PolygonLandTunnel.setMaxAllowedQuads(
          BigNumber.from('500')
        );
        expect(await deployer.PolygonLandTunnel.maxAllowedQuads()).to.be.equal(
          BigNumber.from('500')
        );
      });

      it('cannot Max Allowed Quads if not owner', async function () {
        const {PolygonLandTunnel} = await setupLand();
        await expect(
          PolygonLandTunnel.setMaxAllowedQuads(100000)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('cannot set Max Allowed Quads to zero', async function () {
        const {deployer} = await setupLand();

        await expect(
          deployer.PolygonLandTunnel.setMaxAllowedQuads(0)
        ).to.be.revertedWith(
          'PolygonLandTunnel: max allowed value cannot be zero'
        );
      });

      it('should not be able to transfer Land when paused', async function () {
        const {
          deployer,
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
        await deployer.LandTunnel.pause();

        await expect(
          landHolder.LandTunnel.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.LandTunnel.unpause();

        await waitFor(
          landHolder.LandTunnel.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });

      it('should be able to transfer 1x1 Land', async function () {
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

        await waitFor(
          landHolder.LandTunnel.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 3x3 Land', async function () {
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
        await landHolder.LandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 6x6 Land', async function () {
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
        await landHolder.LandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 12x12 Land', async function () {
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
        await landHolder.LandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );
      });
      it('should be able to transfer 24x24 Land', async function () {
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
        await // expect
        landHolder.LandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        // .to.be.revertedWith('Exceeds max allowed quads');
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(plotCount);
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
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
        } = await setupLand();
        const bytes = '0x00';
        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

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
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          ...mintingData,
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          numberOfTokens
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );
      });

      describe('Through meta transaction', function () {
        it('should be able to transfer 1x1 Land', async function () {
          const {
            Land,
            landMinter,
            users,
            LandTunnel,
            PolygonLand,
            trustedForwarder,
          } = await setupLand();
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
          await landHolder.Land.setApprovalForAll(LandTunnel.address, true);
          const {to, data} = await landHolder.LandTunnel.populateTransaction[
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
          expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(
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
            LandTunnel,
            PolygonLand,
            trustedForwarder,
          } = await setupLand();
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
          await landHolder.Land.setApprovalForAll(LandTunnel.address, true);
          const {to, data} = await landHolder.LandTunnel.populateTransaction[
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
          expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(
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
            LandTunnel,
            PolygonLand,
            trustedForwarder,
          } = await setupLand();
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
          await landHolder.Land.setApprovalForAll(LandTunnel.address, true);
          const {to, data} = await landHolder.LandTunnel.populateTransaction[
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
          expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(
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
            LandTunnel,
            PolygonLand,
            trustedForwarder,
          } = await setupLand();
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
          await landHolder.Land.setApprovalForAll(LandTunnel.address, true);

          const {to, data} = await landHolder.LandTunnel.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](landHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '3000000'
          );

          expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
          expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(
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
            MockLandTunnel,
            PolygonLand,
            MockPolygonLandTunnel,
            trustedForwarder,
          } = await setupLand();
          const bytes = '0x00';
          // Set Mock PolygonLandTunnel in PolygonLand
          await deployer.PolygonLand.setMinter(
            MockPolygonLandTunnel.address,
            true
          );
          expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to
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
            MockLandTunnel.address,
            true
          );
          tx.wait();
          const {
            to,
            data,
          } = await landHolder.MockLandTunnel.populateTransaction[
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
          expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
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
        const {users} = await setupLand();
        const landHolder = users[0];

        await expect(
          landHolder.MockPolygonLandTunnel.pause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('cannot accept randomly transferred land', async function () {
        const {
          deployer,
          landMinter,
          users,
          MockLandTunnel,
          MockPolygonLandTunnel,
        } = await setupLand();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        await expect(
          landHolder.PolygonLand.transferQuad(
            landHolder.address,
            MockPolygonLandTunnel.address,
            size,
            0,
            0,
            bytes
          )
        ).to.be.revertedWith('PolygonLandTunnel: !BRIDGING');
      });

      it('cannot accept randomly transferred lands as batch', async function () {
        const {
          deployer,
          landMinter,
          users,
          MockLandTunnel,
          MockPolygonLandTunnel,
        } = await setupLand();

        const landHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        await expect(
          landHolder.PolygonLand.batchTransferQuad(
            landHolder.address,
            MockPolygonLandTunnel.address,
            [size],
            [0],
            [0],
            bytes
          )
        ).to.be.revertedWith('PolygonLandTunnel: !BRIDGING');
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupLand();
        const landHolder = users[0];

        await deployer.LandTunnel.pause();
        await expect(
          landHolder.MockPolygonLandTunnel.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should not be able to transfer Land when paused', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        await deployer.MockPolygonLandTunnel.pause();
        await expect(
          landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.MockPolygonLandTunnel.unpause();

        const tx = await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 1x1 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 12x12 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should not be able to transfer 2, 12x12 Land at once', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
        } = await setupLand();

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
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size_1],
          [x_1],
          [y_1],
          bytes
        );
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size_2],
          [x_2],
          [y_2],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        await expect(
          landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
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
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 6x6 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should should be able to transfer multiple lands', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
        } = await setupLand();
        const bytes = '0x00';
        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

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
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          ...mintingData,
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          numberOfTokens
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        const tx = await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
          landHolder.address,
          ...mintingData,
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, ...mintingData, bytes]
          )
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should not be able to transfer if exceeds limit', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
        } = await setupLand();
        const bytes = '0x00';

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

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
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          ...mintingData,
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          numberOfTokens
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L2 Tunnel
        await deployer.MockPolygonLandTunnel.setLimit(1, 400);

        // Check if limit is set
        expect(await MockPolygonLandTunnel.maxGasLimitOnL1()).to.eq(500);
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        await expect(
          landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
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
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnel.populateTransaction[
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 3x3 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnel.populateTransaction[
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 6x6 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnel.populateTransaction[
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should be able to transfer 12x12 Land', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
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

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
          plotCount
        );
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L2 Tunnel
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );

        const {
          to,
          data,
        } = await landHolder.MockPolygonLandTunnel.populateTransaction[
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

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });
    });
  });
});
