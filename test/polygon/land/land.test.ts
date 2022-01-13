import {AbiCoder} from '@ethersproject/contracts/node_modules/@ethersproject/abi';
import {ethers} from 'ethers';
import {expect} from '../../chai-setup';
import {waitFor} from '../../utils';
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

      it('should be able to tranfer multiple Lands', async function () {
        const {
          Land,
          landMinter,
          users,
          LandTunnel,
          PolygonLand,
        } = await setupLand();
        const landHolder = users[0];
        const bytes = '0x00';
        // Mint LAND on L1
        const mintingData = [
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
        ];

        await Promise.all(
          [...Array(4).keys()].map((idx) => {
            waitFor(
              landMinter.Land.mintQuad(
                landHolder.address,
                ...mintingData.map((x) => x[idx]),
                bytes
              )
            );
          })
        );
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(765);

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(LandTunnel.address, true);
        await landHolder.LandTunnel.batchTransferQuadToL2(
          landHolder.address,
          ...mintingData,
          bytes
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(765);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          765
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
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
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
        await (
          await landHolder.MockPolygonLandTunnel.triggerTransferToL1(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).wait();

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

      it('should be able to tranfer 12x12 Land', async function () {
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
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
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

        await (
          await landHolder.MockPolygonLandTunnel.triggerTransferToL1(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).wait();

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

      it('should be able to tranfer 24x24 Land', async function () {
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
        const size = 24;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
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
        await (
          await landHolder.MockPolygonLandTunnel.triggerTransferToL1(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).wait();

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

      it('should be able to tranfer 3x3 Land', async function () {
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
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
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
        await (
          await landHolder.MockPolygonLandTunnel.triggerTransferToL1(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).wait();

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

      it('should be able to tranfer 6x6 Land', async function () {
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
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
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

        expect(
          await deployer.MockPolygonLandTunnel.transferredToLandTunnel(
            size,
            x,
            y
          )
        ).to.eq(landHolder.address);

        await (
          await landHolder.MockPolygonLandTunnel.triggerTransferToL1(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).wait();

        expect(
          await deployer.MockPolygonLandTunnel.transferredToLandTunnel(
            size,
            x,
            y
          )
        ).to.eq(ethers.constants.AddressZero);

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

      it('should should be able to tranfer multiple lands', async function () {
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
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );

        const landHolder = users[0];
        const mintingData = [
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
        ];

        const numberOfLands = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await Promise.all(
          [...Array(numberOfLands).keys()].map((idx) => {
            waitFor(
              landMinter.Land.mintQuad(
                landHolder.address,
                ...mintingData.map((x) => x[idx]),
                bytes
              )
            );
          })
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
        await (
          await landHolder.MockPolygonLandTunnel.triggerTransferToL1(
            landHolder.address,
            ...mintingData,
            bytes
          )
        ).wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        await deployer.MockLandTunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [landHolder.address, ...mintingData, bytes]
          )
        );

        expect(await Land.balanceOf(landHolder.address)).to.be.equal(765);
        expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });

      it('should not be able to tranfer if exceeds limit', async function () {
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
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );

        const landHolder = users[0];
        const mintingData = [
          [24, 24],
          [0, 240],
          [0, 240],
        ];

        const numberOfLands = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await Promise.all(
          [...Array(numberOfLands).keys()].map((idx) => {
            waitFor(
              landMinter.Land.mintQuad(
                landHolder.address,
                ...mintingData.map((x) => x[idx]),
                bytes
              )
            );
          })
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

        // Check if limit is set
        expect(await MockPolygonLandTunnel.maxGasLimitOnL1()).to.eq(500);
        await landHolder.PolygonLand.setApprovalForAll(
          MockPolygonLandTunnel.address,
          true
        );
        expect(
          landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
            landHolder.address,
            ...mintingData,
            bytes
          )
        ).to.be.revertedWith('Exceeds gas limit on L1.');
      });
    });
  });
});
