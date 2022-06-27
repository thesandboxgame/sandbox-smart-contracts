import {AbiCoder} from 'ethers/lib/utils';
import {expect} from '../../chai-setup';
import {waitFor} from '../../utils';
import {setupAssetERC721Tunnels} from './fixtures';
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
          await deployer.PolygonAssetERC721Tunnel.maxTransferLimit()
        ).to.be.equal(BigNumber.from('20'));
        await deployer.PolygonAssetERC721Tunnel.setTransferLimit(
          BigNumber.from('21')
        );
        expect(
          await deployer.PolygonAssetERC721Tunnel.maxTransferLimit()
        ).to.be.equal(BigNumber.from('21'));
      });

      it('cannot set Max Limit on L1 if not owner', async function () {
        const {PolygonAssetERC721Tunnel} = await setupAssetERC721Tunnels();
        await expect(
          PolygonAssetERC721Tunnel.setTransferLimit(BigNumber.from('22'))
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
        const uri = 'http://myMetadata.io/1';
        const data = abiCoder.encode(['string'], [uri]);

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
          assetHolder.AssetERC721Tunnel.batchDepositToChild(
            assetHolder.address,
            [123]
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.AssetERC721Tunnel.unpause();

        await waitFor(
          assetHolder.AssetERC721Tunnel.batchDepositToChild(
            assetHolder.address,
            [123]
          )
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(1);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(1);
      });

      it('should be able to transfer multiple assets to L2', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721Tunnels();

        const abiCoder = new AbiCoder();
        const uriBase = 'http://myMetadata.io';

        const assetHolder = users[0];
        const numberOfAssetERC721s = 25;
        const startId = 1;
        const ids = [];

        // Set up arrays and mint on L1
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          ids.push(i);
          const uniqueUri = `${uriBase}/${i}`;
          const data = abiCoder.encode(['string'], [uniqueUri]);
          await assetMinter.AssetERC721['mint(address,uint256,bytes)'](
            assetHolder.address,
            i,
            data
          );
        }

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfAssetERC721s
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );

        await assetHolder.MockAssetERC721Tunnel.batchDepositToChild(
          assetHolder.address,
          ids
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(numberOfAssetERC721s);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfAssetERC721s);
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          expect(await PolygonAssetERC721.tokenUris(i)).to.be.equal(
            `${uriBase}/${i}`
          );
        }
      });

      it('should be able to transfer multiple assets to L2 - higher start id', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721Tunnels();

        const abiCoder = new AbiCoder();
        const uriBase = 'http://myMetadata.io';

        const assetHolder = users[0];
        const numberOfAssetERC721s = 25;
        const startId = 10124;
        const ids = [];

        // Set up arrays and mint on L1
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          ids.push(i);
          const uniqueUri = `${uriBase}/${i}`;
          const data = abiCoder.encode(['string'], [uniqueUri]);
          await assetMinter.AssetERC721['mint(address,uint256,bytes)'](
            assetHolder.address,
            i,
            data
          );
        }

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfAssetERC721s
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );

        await assetHolder.MockAssetERC721Tunnel.batchDepositToChild(
          assetHolder.address,
          ids
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(numberOfAssetERC721s);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfAssetERC721s);
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          expect(await PolygonAssetERC721.tokenUris(i)).to.be.equal(
            `${uriBase}/${i}`
          );
        }
      });
    });

    // TODO:: tests to show extraction on L2
    // TODO: test where token already exists so is not minted again

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

    describe('L2 to L1', function () {
      it('only owner can pause tunnels', async function () {
        // const bytes = '0x00';

        // // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        // await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
        //   MockPolygonAssetERC721Tunnel.address
        // );
        // expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
        //   MockPolygonAssetERC721Tunnel.address
        // );

        // const assetHolder = users[0];
        // const mintingData = [
        //   [1, 1],
        //   [0, 240],
        //   [0, 240],
        // ];

        // const numberOfAssetERC721s = mintingData[0].length;
        // const numberOfTokens = mintingData[0]
        //   .map((elem) => elem * elem)
        //   .reduce((a, b) => a + b, 0);
        // await Promise.all(
        //   [...Array(numberOfAssetERC721s).keys()].map((idx) => {
        //     waitFor(
        //       assetMinter.AssetERC721.mintQuad(
        //         assetHolder.address,
        //         ...mintingData.map((x) => x[idx]),
        //         bytes
        //       )
        //     );
        //   })
        // );
        // expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
        //   numberOfTokens
        // );

        // // Transfer to L1 Tunnel
        // await assetHolder.AssetERC721.setApprovalForAll(
        //   MockAssetERC721Tunnel.address,
        //   true
        // );
        // await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
        //   assetHolder.address,
        //   ...mintingData,
        //   bytes
        // );

        // expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        // expect(
        //   await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        // ).to.be.equal(numberOfTokens);
        // expect(
        //   await PolygonAssetERC721.balanceOf(assetHolder.address)
        // ).to.be.equal(numberOfTokens);

        // // Transfer to L2 Tunnel
        // await deployer.MockPolygonAssetERC721Tunnel.setLimit(1, 400);

        // // Check if limit is set
        // expect(await MockPolygonAssetERC721Tunnel.maxGasLimitOnL1()).to.eq(500);
        // await assetHolder.PolygonAssetERC721.setApprovalForAll(
        //   MockPolygonAssetERC721Tunnel.address,
        //   true
        // );
        // await expect(
        //   assetHolder.MockPolygonAssetERC721Tunnel.batchTransferToL1(
        //     assetHolder.address,
        //     ...mintingData,
        //     bytes
        //   )
        // ).to.be.revertedWith('Exceeds gas limit on L1.');
        const {users} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.pause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await deployer.AssetERC721Tunnel.pause();
        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should not be able to transfer AssetERC721 when paused', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721Tunnels();

        const assetHolder = users[0];
        const uri = 'http://myMetadata.io/1';
        const abiCoder = new AbiCoder();
        const data = abiCoder.encode(['string'], [uri]);
        const dataArray = abiCoder.encode(['string[]'], [[uri]]);
        const tokenId = 123;

        // Mint AssetERC721 on L1
        await assetMinter.AssetERC721['mint(address,uint256,bytes)'](
          assetHolder.address,
          tokenId,
          data
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(1);

        expect(await AssetERC721.ownerOf(tokenId)).to.be.equal(
          assetHolder.address
        );

        // Transfer to L1 Tunnel "batchDepositToChild"
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchDepositToChild(
          assetHolder.address,
          [tokenId]
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);

        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(1);

        expect(await AssetERC721.ownerOf(tokenId)).to.be.equal(
          MockAssetERC721Tunnel.address
        );

        // Check assetHolder has received asset on L2
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(1);

        // Transfer to L2 Tunnel "batchWithdrawToRoot"
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        await deployer.MockPolygonAssetERC721Tunnel.pause();
        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.batchWithdrawToRoot(
            assetHolder.address,
            [tokenId]
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.MockPolygonAssetERC721Tunnel.unpause();

        const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchWithdrawToRoot(
          assetHolder.address,
          [tokenId]
        );
        await tx.wait();

        // Check Polygon balances
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);

        expect(
          await PolygonAssetERC721.balanceOf(
            MockPolygonAssetERC721Tunnel.address
          )
        ).to.be.equal(1);

        // Release on L1
        await deployer.MockAssetERC721Tunnel.receiveMessage(
          new AbiCoder().encode(
            ['address', 'uint256[]', 'bytes'],
            [assetHolder.address, [tokenId], dataArray]
          )
        );

        // Confirm L1 balances
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(1);

        expect(await AssetERC721.ownerOf(tokenId)).to.be.equal(
          assetHolder.address
        );

        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
      });

      it('should be able to transfer 1 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721Tunnels();
        const abiCoder = new AbiCoder();
        const uri = 'http://myMetadata.io/1';
        const data = abiCoder.encode(['string'], [uri]);
        const assetHolder = users[0];
        const Id = 1;

        await assetMinter.PolygonAssetERC721['mint(address,uint256,bytes)'](
          assetHolder.address,
          Id,
          data
        );
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(1);

        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );

        waitFor(
          assetHolder.MockPolygonAssetERC721Tunnel.batchWithdrawToRoot(
            assetHolder.address,
            [Id]
          )
        );
        const rootData = new AbiCoder().encode(
          ['address', 'uint256', 'bytes'],
          [assetHolder.address, Id, data]
        );
        await deployer.MockAssetERC721Tunnel[`receiveMessage(bytes)`](rootData);

        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(
            MockPolygonAssetERC721Tunnel.address
          )
        ).to.be.equal(1);
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(1);

        expect(await AssetERC721.ownerOf(Id)).to.be.equal(assetHolder.address);
      });

      it('should should be able to transfer multiple assets', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721Tunnels();

        const abiCoder = new AbiCoder();
        const uriBase = 'http://myMetadata.io';

        const assetHolder = users[0];
        const numberOfAssetERC721s = 15;
        const startId = 10124;
        const ids = [];

        // Set up arrays and mint on L2
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          ids.push(i);
          const uniqueUri = `${uriBase}/${i}`;
          const data = abiCoder.encode(['string'], [uniqueUri]);
          await assetMinter.PolygonAssetERC721['mint(address,uint256,bytes)'](
            assetHolder.address,
            i,
            data
          );
        }

        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfAssetERC721s);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockPolygonAssetERC721Tunnel.batchWithdrawToRoot(
          assetHolder.address,
          ids
        );

        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          const uniqueUri = `${uriBase}/${i}`;
          const data = abiCoder.encode(['string[]'], [[uniqueUri]]);
          const rootData = new AbiCoder().encode(
            ['address', 'uint256[]', 'bytes'],
            [assetHolder.address, [i], data]
          );
          await deployer.MockAssetERC721Tunnel[`receiveMessage(bytes)`](
            rootData
          );
        }

        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(
            MockPolygonAssetERC721Tunnel.address
          )
        ).to.be.equal(numberOfAssetERC721s);
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfAssetERC721s
        );

        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          expect(await AssetERC721.ownerOf(i)).to.be.equal(assetHolder.address);
        }
      });

      it('should not be able to transfer if exceeds limit', async function () {
        const {
          assetMinter,
          users,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721Tunnels();
        const abiCoder = new AbiCoder();
        const uriBase = 'http://myMetadata.io';

        const assetHolder = users[0];
        const numberOfAssetERC721s = 25;
        const startId = 10124;
        const ids = [];

        // Set up arrays and mint on L2
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          ids.push(i);
          const uniqueUri = `${uriBase}/${i}`;
          const data = abiCoder.encode(['string'], [uniqueUri]);
          await assetMinter.PolygonAssetERC721['mint(address,uint256,bytes)'](
            assetHolder.address,
            i,
            data
          );
        }

        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfAssetERC721s);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.batchWithdrawToRoot(
            assetHolder.address,
            ids
          )
        ).to.be.revertedWith('EXCEEDS_TRANSFER_LIMIT');
      });
    });
    describe('Through meta Tx', function () {
      // it('should be able to transfer 1 AssetERC721', async function () {
      //   const {
      //     deployer,
      //     AssetERC721,
      //     assetMinter,
      //     users,
      //     MockAssetERC721Tunnel,
      //     PolygonAssetERC721,
      //     MockPolygonAssetERC721Tunnel,
      //     trustedForwarder,
      //   } = await setupAssetERC721Tunnels();
      //   const assetHolder = users[0];
      //   const size = 1;
      //   const x = 0;
      //   const y = 0;
      //   const bytes = '0x00';
      //   const plotCount = size * size;
      //   // Mint LAND on L1
      //   await assetMinter.AssetERC721.mintQuad(
      //     assetHolder.address,
      //     size,
      //     x,
      //     y,
      //     bytes
      //   );
      //   expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
      //     plotCount
      //   );
      //   // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
      //   await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
      //     MockPolygonAssetERC721Tunnel.address
      //   );
      //   expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
      //     MockPolygonAssetERC721Tunnel.address
      //   );
      //   // Transfer to L1 Tunnel
      //   await assetHolder.AssetERC721.setApprovalForAll(
      //     MockAssetERC721Tunnel.address,
      //     true
      //   );
      //   await assetHolder.MockAssetERC721Tunnel.batchTransferToL2(
      //     assetHolder.address,
      //     [size],
      //     [x],
      //     [y],
      //     bytes
      //   );
      //   expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
      //   expect(
      //     await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
      //   ).to.be.equal(plotCount);
      //   expect(
      //     await PolygonAssetERC721.balanceOf(assetHolder.address)
      //   ).to.be.equal(plotCount);
      //   // Transfer to L2 Tunnel
      //   await assetHolder.PolygonAssetERC721.setApprovalForAll(
      //     MockPolygonAssetERC721Tunnel.address,
      //     true
      //   );
      //   const {
      //     to,
      //     data,
      //   } = await assetHolder.MockPolygonAssetERC721Tunnel.populateTransaction[
      //     'batchTransferToL1(address,uint256[],bytes)'
      //   ](assetHolder.address, [size], [x], [y], bytes);
      //   await sendMetaTx(
      //     to,
      //     trustedForwarder,
      //     data,
      //     assetHolder.address,
      //     '1000000'
      //   );
      //   console.log('DUMMY CHECKPOINT. moving on...');
      //   // Release on L1
      //   const abiCoder = new AbiCoder();
      //   await deployer.MockAssetERC721Tunnel.receiveMessage(
      //     abiCoder.encode(
      //       ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
      //       [assetHolder.address, [size], [x], [y], bytes]
      //     )
      //   );
      //   expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
      //     plotCount
      //   );
      //   expect(
      //     await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
      //   ).to.be.equal(0);
      //   expect(
      //     await PolygonAssetERC721.balanceOf(assetHolder.address)
      //   ).to.be.equal(0);
      // });
    });
  });
});
