import {ethers} from 'hardhat';
import {AbiCoder} from 'ethers/lib/utils';
import {expect} from '../../chai-setup';
import {waitFor} from '../../utils';
import {setupAssetERC721Tunnels} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';
import {BigNumber} from 'ethers';

describe('PolygonAssetERC721.sol', function () {
  describe('AssetERC721 <> PolygonAssetERC721: Transfer', function () {
    describe('L1 to L2', function () {
      it('only owner can pause tunnels', async function () {
        const {users} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await expect(assetHolder.AssetERC721Tunnel.pause()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await deployer.AssetERC721Tunnel.pause();
        await expect(
          assetHolder.AssetERC721Tunnel.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('set Max Limit on L1', async function () {
        const {deployer} = await setupAssetERC721Tunnels();

        expect(
          await deployer.PolygonAssetERC721Tunnel.maxGasLimitOnL1()
        ).to.be.equal(BigNumber.from('500'));
        await deployer.PolygonAssetERC721Tunnel.setMaxLimitOnL1(
          BigNumber.from('100000')
        );
        expect(
          await deployer.PolygonAssetERC721Tunnel.maxGasLimitOnL1()
        ).to.be.equal(BigNumber.from('100000'));
      });

      it('cannot set Max Limit on L1 if not owner', async function () {
        const {PolygonAssetERC721Tunnel} = await setupAssetERC721Tunnels();
        await expect(
          PolygonAssetERC721Tunnel.setMaxLimitOnL1(BigNumber.from('100000'))
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should not be able to transfer AssetERC721 when paused', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          AssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721Tunnels();
        const assetHolder = users[0];
        const abiCoder = new AbiCoder();
        const dummyMetadataHash = ethers.utils.keccak256('0x42');
        const data = abiCoder.encode(['bytes32'], [dummyMetadataHash]);

        // Mint AssetERC721 on L1
        await assetMinter.AssetERC721['mint(address,uint256,bytes)'](
          assetHolder.address,
          123,
          data
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(1);

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          AssetERC721Tunnel.address,
          true
        );
        await deployer.AssetERC721Tunnel.pause();

        await expect(
          assetHolder.AssetERC721Tunnel.batchTransferToL2(
            assetHolder.address,
            [123],
            data
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.AssetERC721Tunnel.unpause();

        await waitFor(
          assetHolder.AssetERC721Tunnel.batchTransferToL2(
            assetHolder.address,
            [123],
            data
          )
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(1);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(1);

        // TODO: check metadataHash is correctly stored
      });

      it('should should be able to transfer multiple assets to L2', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721Tunnels();

        const abiCoder = new AbiCoder();
        const dummyMetadataHash = ethers.utils.keccak256('0x42');
        const data = abiCoder.encode(['bytes32'], [dummyMetadataHash]);
        const assetHolder = users[0];
        const numberOfAssetERC721s = 25;
        const startId = 0;
        const ids = [];
        // let count = 0;

        // Mint on L1
        for (let i = startId; i < numberOfAssetERC721s; i++) {
          await assetMinter.AssetERC721['mint(address,uint256,bytes)'](
            assetHolder.address,
            i,
            data
          );
          ids.push(i);
        }
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfAssetERC721s
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
          assetHolder.address,
          ids,
          data // TODO: current implementation assumes same metadataHash for each id, should be bytes[] ? - review
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(numberOfAssetERC721s);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfAssetERC721s);
        // TODO: tests to show minting and transfers with higher startId
        // TODO: tests to show that different token ids can have different metadatahashes
        // TODO:: tests to show extraction on L2
      });

      // describe('Through meta transaction', function () {
      //   it('should be able to transfer 1 AssetERC721', async function () {
      //     const {
      //       AssetERC721,
      //       assetMinter,
      //       users,
      //       AssetERC721Tunnel,
      //       PolygonAssetERC721,
      //       trustedForwarder,
      //     } = await setupAssetERC721Tunnels();
      //     const assetHolder = users[0];
      //     const size = 1;
      //     const x = 0;
      //     const y = 0;
      //     const bytes = '0x00';
      //     const plotCount = size * size;
      //     // Mint LAND on L1
      //     await assetMinter.AssetERC721.mintQuad(
      //       assetHolder.address,
      //       size,
      //       x,
      //       y,
      //       bytes
      //     );
      //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
      //       plotCount
      //     );
      //     // Transfer to L1 Tunnel
      //     await assetHolder.AssetERC721.setApprovalForAll(
      //       AssetERC721Tunnel.address,
      //       true
      //     );
      //     const {
      //       to,
      //       data,
      //     } = await assetHolder.AssetERC721Tunnel.populateTransaction[
      //       'batchTransferToL2(address,uint256[],bytes)'
      //     ](assetHolder.address, [size], [x], [y], bytes);
      //     await sendMetaTx(
      //       to,
      //       trustedForwarder,
      //       data,
      //       assetHolder.address,
      //       '1000000'
      //     );
      //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
      //       0
      //     );
      //     expect(
      //       await AssetERC721.balanceOf(AssetERC721Tunnel.address)
      //     ).to.be.equal(plotCount);
      //     expect(
      //       await PolygonAssetERC721.balanceOf(assetHolder.address)
      //     ).to.be.equal(plotCount);
      //   });
      //   it('should should be able to transfer multiple assets meta', async function () {
      //     const {
      //       deployer,
      //       AssetERC721,
      //       assetMinter,
      //       users,
      //       MockAssetERC721Tunnel,
      //       PolygonAssetERC721,
      //       MockPolygonAssetERC721Tunnel,
      //       trustedForwarder,
      //     } = await setupAssetERC721Tunnels();
      //     const bytes = '0x00';
      //     // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
      //     await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
      //       MockPolygonAssetERC721Tunnel.address
      //     );
      //     expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
      //       MockPolygonAssetERC721Tunnel.address
      //     );
      //     const assetHolder = users[0];
      //     const mintingData = [
      //       [6, 3],
      //       [0, 24],
      //       [0, 24],
      //     ];
      //     const numberOfAssetERC721s = mintingData[0].length;
      //     const numberOfTokens = mintingData[0]
      //       .map((elem) => elem * elem)
      //       .reduce((a, b) => a + b, 0);
      //     await Promise.all(
      //       [...Array(numberOfAssetERC721s).keys()].map((idx) => {
      //         waitFor(
      //           assetMinter.AssetERC721.mintQuad(
      //             assetHolder.address,
      //             ...mintingData.map((x) => x[idx]),
      //             bytes
      //           )
      //         );
      //       })
      //     );
      //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
      //       numberOfTokens
      //     );
      //     // Transfer to L1 Tunnel
      //     const tx = await assetHolder.AssetERC721.setApprovalForAll(
      //       MockAssetERC721Tunnel.address,
      //       true
      //     );
      //     tx.wait();
      //     const {
      //       to,
      //       data,
      //     } = await assetHolder.MockAssetERC721Tunnel.populateTransaction[
      //       'batchTransferToL2(address,uint256[],bytes)'
      //     ](assetHolder.address, ...mintingData, bytes);
      //     await sendMetaTx(
      //       to,
      //       trustedForwarder,
      //       data,
      //       assetHolder.address,
      //       '1000000'
      //     );
      //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
      //       0
      //     );
      //     expect(
      //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
      //     ).to.be.equal(numberOfTokens);
      //     expect(
      //       await PolygonAssetERC721.balanceOf(assetHolder.address)
      //     ).to.be.equal(numberOfTokens);
      //   });
      // });
    });
    // describe('L2 to L1', function () {
    //   it('only owner can pause tunnels', async function () {
    //     const {users} = await setupAssetERC721Tunnels();
    //     const assetHolder = users[0];

    //     await expect(
    //       assetHolder.MockPolygonAssetERC721Tunnel.pause()
    //     ).to.be.revertedWith('Ownable: caller is not the owner');
    //   });

    //   it('only owner can unpause tunnels', async function () {
    //     const {deployer, users} = await setupAssetERC721Tunnels();
    //     const assetHolder = users[0];

    //     await deployer.AssetERC721Tunnel.pause();
    //     await expect(
    //       assetHolder.MockPolygonAssetERC721Tunnel.unpause()
    //     ).to.be.revertedWith('Ownable: caller is not the owner');
    //   });

    //   it('should not be able to transfer AssetERC721 when paused', async function () {
    //     const {
    //       deployer,
    //       AssetERC721,
    //       assetMinter,
    //       users,
    //       MockAssetERC721Tunnel,
    //       PolygonAssetERC721,
    //       MockPolygonAssetERC721Tunnel,
    //     } = await setupAssetERC721Tunnels();

    //     const assetHolder = users[0];
    //     const size = 1;
    //     const x = 0;
    //     const y = 0;
    //     const bytes = '0x00';
    //     const plotCount = size * size;

    //     // Mint LAND on L1
    //     await assetMinter.AssetERC721.mintQuad(
    //       assetHolder.address,
    //       size,
    //       x,
    //       y,
    //       bytes
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       plotCount
    //     );

    //     // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
    //     await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     // Transfer to L1 Tunnel
    //     await assetHolder.AssetERC721.setApprovalForAll(
    //       MockAssetERC721Tunnel.address,
    //       true
    //     );
    //     await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
    //       assetHolder.address,
    //       [size],
    //       [x],
    //       [y],
    //       bytes
    //     );

    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(plotCount);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(plotCount);

    //     // Transfer to L2 Tunnel
    //     await assetHolder.PolygonAssetERC721.setApprovalForAll(
    //       MockPolygonAssetERC721Tunnel.address,
    //       true
    //     );
    //     await deployer.MockPolygonAssetERC721Tunnel.pause();
    //     await expect(
    //       assetHolder.MockPolygonAssetERC721Tunnel.batchTransferToL1(
    //         assetHolder.address,
    //         [size],
    //         [x],
    //         [y],
    //         bytes
    //       )
    //     ).to.be.revertedWith('Pausable: paused');

    //     await deployer.MockPolygonAssetERC721Tunnel.unpause();

    //     const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferToL1(
    //       assetHolder.address,
    //       [size],
    //       [x],
    //       [y],
    //       bytes
    //     );
    //     await tx.wait();

    //     console.log('DUMMY CHECKPOINT. moving on...');

    //     // Release on L1
    //     const abiCoder = new AbiCoder();

    //     await deployer.MockAssetERC721Tunnel.receiveMessage(
    //       abiCoder.encode(
    //         ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
    //         [assetHolder.address, [size], [x], [y], bytes]
    //       )
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       plotCount
    //     );
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(0);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(0);
    //   });

    //   it('should be able to transfer 1 AssetERC721', async function () {
    //     const {
    //       deployer,
    //       AssetERC721,
    //       assetMinter,
    //       users,
    //       MockAssetERC721Tunnel,
    //       PolygonAssetERC721,
    //       MockPolygonAssetERC721Tunnel,
    //     } = await setupAssetERC721Tunnels();

    //     const assetHolder = users[0];
    //     const size = 1;
    //     const x = 0;
    //     const y = 0;
    //     const bytes = '0x00';
    //     const plotCount = size * size;

    //     // Mint LAND on L1
    //     await assetMinter.AssetERC721.mintQuad(
    //       assetHolder.address,
    //       size,
    //       x,
    //       y,
    //       bytes
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       plotCount
    //     );

    //     // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
    //     await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     // Transfer to L1 Tunnel
    //     await assetHolder.AssetERC721.setApprovalForAll(
    //       MockAssetERC721Tunnel.address,
    //       true
    //     );
    //     await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
    //       assetHolder.address,
    //       [size],
    //       [x],
    //       [y],
    //       bytes
    //     );

    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(plotCount);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(plotCount);

    //     // Transfer to L2 Tunnel
    //     await assetHolder.PolygonAssetERC721.setApprovalForAll(
    //       MockPolygonAssetERC721Tunnel.address,
    //       true
    //     );
    //     const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferToL1(
    //       assetHolder.address,
    //       [size],
    //       [x],
    //       [y],
    //       bytes
    //     );
    //     await tx.wait();

    //     console.log('DUMMY CHECKPOINT. moving on...');

    //     // Release on L1
    //     const abiCoder = new AbiCoder();

    //     await deployer.MockAssetERC721Tunnel.receiveMessage(
    //       abiCoder.encode(
    //         ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
    //         [assetHolder.address, [size], [x], [y], bytes]
    //       )
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       plotCount
    //     );
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(0);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(0);
    //   });

    //   it('should should be able to transfer multiple assets', async function () {
    //     const {
    //       deployer,
    //       AssetERC721,
    //       assetMinter,
    //       users,
    //       MockAssetERC721Tunnel,
    //       PolygonAssetERC721,
    //       MockPolygonAssetERC721Tunnel,
    //     } = await setupAssetERC721Tunnels();
    //     const bytes = '0x00';
    //     // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
    //     await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
    //       MockPolygonAssetERC721Tunnel.address
    //     );

    //     const assetHolder = users[0];
    //     const mintingData = [
    //       [6, 3],
    //       [30, 24],
    //       [30, 24],
    //     ];

    //     const numberOfAssetERC721s = mintingData[0].length;
    //     const numberOfTokens = mintingData[0]
    //       .map((elem) => elem * elem)
    //       .reduce((a, b) => a + b, 0);
    //     await Promise.all(
    //       [...Array(numberOfAssetERC721s).keys()].map((idx) => {
    //         waitFor(
    //           assetMinter.AssetERC721.mintQuad(
    //             assetHolder.address,
    //             ...mintingData.map((x) => x[idx]),
    //             bytes
    //           )
    //         );
    //       })
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       numberOfTokens
    //     );

    //     // Transfer to L1 Tunnel
    //     await assetHolder.AssetERC721.setApprovalForAll(
    //       MockAssetERC721Tunnel.address,
    //       true
    //     );
    //     await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
    //       assetHolder.address,
    //       ...mintingData,
    //       bytes
    //     );

    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(numberOfTokens);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(numberOfTokens);

    //     // Transfer to L2 Tunnel
    //     await assetHolder.PolygonAssetERC721.setApprovalForAll(
    //       MockPolygonAssetERC721Tunnel.address,
    //       true
    //     );
    //     const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferToL1(
    //       assetHolder.address,
    //       ...mintingData,
    //       bytes
    //     );
    //     await tx.wait();

    //     console.log('DUMMY CHECKPOINT. moving on...');

    //     const abiCoder = new AbiCoder();

    //     await deployer.MockAssetERC721Tunnel.receiveMessage(
    //       abiCoder.encode(
    //         ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
    //         [assetHolder.address, ...mintingData, bytes]
    //       )
    //     );

    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       numberOfTokens
    //     );
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(0);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(0);
    //   });

    //   it('should not be able to transfer if exceeds limit', async function () {
    //     const {
    //       deployer,
    //       AssetERC721,
    //       assetMinter,
    //       users,
    //       MockAssetERC721Tunnel,
    //       PolygonAssetERC721,
    //       MockPolygonAssetERC721Tunnel,
    //     } = await setupAssetERC721Tunnels();
    //     const bytes = '0x00';

    //     // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
    //     await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
    //       MockPolygonAssetERC721Tunnel.address
    //     );

    //     const assetHolder = users[0];
    //     const mintingData = [
    //       [1, 1],
    //       [0, 240],
    //       [0, 240],
    //     ];

    //     const numberOfAssetERC721s = mintingData[0].length;
    //     const numberOfTokens = mintingData[0]
    //       .map((elem) => elem * elem)
    //       .reduce((a, b) => a + b, 0);
    //     await Promise.all(
    //       [...Array(numberOfAssetERC721s).keys()].map((idx) => {
    //         waitFor(
    //           assetMinter.AssetERC721.mintQuad(
    //             assetHolder.address,
    //             ...mintingData.map((x) => x[idx]),
    //             bytes
    //           )
    //         );
    //       })
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       numberOfTokens
    //     );

    //     // Transfer to L1 Tunnel
    //     await assetHolder.AssetERC721.setApprovalForAll(
    //       MockAssetERC721Tunnel.address,
    //       true
    //     );
    //     await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
    //       assetHolder.address,
    //       ...mintingData,
    //       bytes
    //     );

    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(numberOfTokens);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(numberOfTokens);

    //     // Transfer to L2 Tunnel
    //     await deployer.MockPolygonAssetERC721Tunnel.setLimit(1, 400);

    //     // Check if limit is set
    //     expect(await MockPolygonAssetERC721Tunnel.maxGasLimitOnL1()).to.eq(500);
    //     await assetHolder.PolygonAssetERC721.setApprovalForAll(
    //       MockPolygonAssetERC721Tunnel.address,
    //       true
    //     );
    //     await expect(
    //       assetHolder.MockPolygonAssetERC721Tunnel.batchTransferToL1(
    //         assetHolder.address,
    //         ...mintingData,
    //         bytes
    //       )
    //     ).to.be.revertedWith('Exceeds gas limit on L1.');
    //   });
    // });
    // describe('Through meta Tx', function () {
    //   it('should be able to transfer 1 AssetERC721', async function () {
    //     const {
    //       deployer,
    //       AssetERC721,
    //       assetMinter,
    //       users,
    //       MockAssetERC721Tunnel,
    //       PolygonAssetERC721,
    //       MockPolygonAssetERC721Tunnel,
    //       trustedForwarder,
    //     } = await setupAssetERC721Tunnels();

    //     const assetHolder = users[0];
    //     const size = 1;
    //     const x = 0;
    //     const y = 0;
    //     const bytes = '0x00';
    //     const plotCount = size * size;

    //     // Mint LAND on L1
    //     await assetMinter.AssetERC721.mintQuad(
    //       assetHolder.address,
    //       size,
    //       x,
    //       y,
    //       bytes
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       plotCount
    //     );

    //     // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
    //     await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
    //       MockPolygonAssetERC721Tunnel.address
    //     );
    //     // Transfer to L1 Tunnel
    //     await assetHolder.AssetERC721.setApprovalForAll(
    //       MockAssetERC721Tunnel.address,
    //       true
    //     );
    //     await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
    //       assetHolder.address,
    //       [size],
    //       [x],
    //       [y],
    //       bytes
    //     );

    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(plotCount);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(plotCount);

    //     // Transfer to L2 Tunnel
    //     await assetHolder.PolygonAssetERC721.setApprovalForAll(
    //       MockPolygonAssetERC721Tunnel.address,
    //       true
    //     );

    //     const {
    //       to,
    //       data,
    //     } = await assetHolder.MockPolygonAssetERC721Tunnel.populateTransaction[
    //       'batchTransferToL1(address,uint256[],bytes)'
    //     ](assetHolder.address, [size], [x], [y], bytes);

    //     await sendMetaTx(
    //       to,
    //       trustedForwarder,
    //       data,
    //       assetHolder.address,
    //       '1000000'
    //     );

    //     console.log('DUMMY CHECKPOINT. moving on...');

    //     // Release on L1
    //     const abiCoder = new AbiCoder();

    //     await deployer.MockAssetERC721Tunnel.receiveMessage(
    //       abiCoder.encode(
    //         ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
    //         [assetHolder.address, [size], [x], [y], bytes]
    //       )
    //     );
    //     expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
    //       plotCount
    //     );
    //     expect(
    //       await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
    //     ).to.be.equal(0);
    //     expect(
    //       await PolygonAssetERC721.balanceOf(assetHolder.address)
    //     ).to.be.equal(0);
    //   });
    // });
  });
});
