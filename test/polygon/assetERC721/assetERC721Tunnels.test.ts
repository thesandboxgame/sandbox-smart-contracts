import {AbiCoder} from 'ethers/lib/utils';
import {expect} from '../../chai-setup';
import {waitFor} from '../../utils';
import {setupAssetERC721Tunnels} from './fixtures';
import {BigNumber} from 'ethers';

describe('Asset_ERC721_Tunnels', function () {
  describe('AssetERC721 <> PolygonAssetERC721: Transfer', function () {
    describe('L1 to L2', function () {
      it('if not owner cannot pause tunnels', async function () {
        const {users} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await expect(assetHolder.AssetERC721Tunnel.pause()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('if not owner cannot unpause tunnels', async function () {
        const {users, deployer} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await deployer.AssetERC721Tunnel.pause();
        await expect(
          assetHolder.AssetERC721Tunnel.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('owner can set Max Limit on L1', async function () {
        const {deployer} = await setupAssetERC721Tunnels();

        expect(await deployer.AssetERC721Tunnel.maxTransferLimit()).to.be.equal(
          BigNumber.from('20')
        );
        await deployer.AssetERC721Tunnel.setTransferLimit(BigNumber.from('21'));
        expect(await deployer.AssetERC721Tunnel.maxTransferLimit()).to.be.equal(
          BigNumber.from('21')
        );
      });

      it('cannot set Max Limit on L1 if not owner', async function () {
        const {AssetERC721Tunnel} = await setupAssetERC721Tunnels();
        await expect(
          AssetERC721Tunnel.setTransferLimit(BigNumber.from('22'))
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
          MockAssetERC721Tunnel.address,
          true
        );
        await deployer.MockAssetERC721Tunnel.pause();

        await expect(
          assetHolder.MockAssetERC721Tunnel.batchDepositToChild(
            assetHolder.address,
            [123]
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.MockAssetERC721Tunnel.unpause();

        await waitFor(
          assetHolder.MockAssetERC721Tunnel.batchDepositToChild(
            assetHolder.address,
            [123]
          )
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(1);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(1);
        const uriL1 = await AssetERC721.tokenUris(123);
        const uriL2 = await PolygonAssetERC721.tokenUris(123);
        expect(uriL1).to.be.equal(uriL2);
      });

      it('cannot tranfer asset directly to tunnel l1', async function () {
        const {
          assetMinter,
          users,
          AssetERC721Tunnel,
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

        expect(
          await assetHolder.AssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(1);

        await expect(
          assetHolder.AssetERC721['safeTransferFrom(address,address,uint256)'](
            assetHolder.address,
            AssetERC721Tunnel.address,
            123
          )
        ).to.be.revertedWith("AssetERC721Tunnel: can't directly send Assets");
      });

      it('cannot tranfer asset directly to tunnel l2', async function () {
        const {
          assetMinter,
          users,
          PolygonAssetERC721Tunnel,
        } = await setupAssetERC721Tunnels();
        const assetHolder = users[0];
        const abiCoder = new AbiCoder();
        const uri = 'http://myMetadata.io/1';
        const data = abiCoder.encode(['string'], [uri]);

        // Mint AssetERC721 on L2
        await assetMinter.PolygonAssetERC721['mint(address,uint256,bytes)'](
          assetHolder.address,
          123,
          data
        );

        expect(
          await assetHolder.PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(1);
        await expect(
          assetHolder.PolygonAssetERC721[
            'safeTransferFrom(address,address,uint256)'
          ](assetHolder.address, PolygonAssetERC721Tunnel.address, 123)
        ).to.be.revertedWith(
          "PolygonAssetERC721Tunnel: can't directly send Assets"
        );
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
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          const uriL1 = await AssetERC721.tokenUris(i);
          const uriL2 = await PolygonAssetERC721.tokenUris(i);
          expect(uriL1).to.be.equal(uriL2);
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
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          const uriL1 = await AssetERC721.tokenUris(i);
          const uriL2 = await PolygonAssetERC721.tokenUris(i);
          expect(uriL1).to.be.equal(uriL2);
        }
      });
    });

    describe('L2 to L1', function () {
      it('if not owner cannot pause tunnels', async function () {
        const {users} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await expect(
          assetHolder.PolygonAssetERC721Tunnel.pause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
      it('only owner can pause tunnels', async function () {
        const {deployer} = await setupAssetERC721Tunnels();
        await expect(deployer.PolygonAssetERC721Tunnel.pause()).to.not.be
          .reverted;
      });

      it('if not owner cannot unpause tunnels', async function () {
        const {deployer, users} = await setupAssetERC721Tunnels();
        const assetHolder = users[0];

        await deployer.PolygonAssetERC721Tunnel.pause();
        await expect(
          assetHolder.PolygonAssetERC721Tunnel.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer} = await setupAssetERC721Tunnels();

        await deployer.PolygonAssetERC721Tunnel.pause();
        await expect(deployer.PolygonAssetERC721Tunnel.unpause()).to.not.be
          .reverted;
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
        const dataArray = [uri];
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
            ['address', 'uint256[]', 'string[]'],
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
        const uriL1 = await AssetERC721.tokenUris(tokenId);
        const uriL2 = await PolygonAssetERC721.tokenUris(tokenId);
        expect(uriL1).to.be.equal(uriL2);
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
        const dataArray = [uri];
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

        await waitFor(
          assetHolder.MockPolygonAssetERC721Tunnel.batchWithdrawToRoot(
            assetHolder.address,
            [Id]
          )
        );
        const rootData = new AbiCoder().encode(
          ['address', 'uint256[]', 'string[]'],
          [assetHolder.address, [Id], dataArray]
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
        const uriL1 = await AssetERC721.tokenUris(Id);
        const uriL2 = await PolygonAssetERC721.tokenUris(Id);
        expect(uriL1).to.be.equal(uriL2);
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
          const data = [uniqueUri];
          const rootData = new AbiCoder().encode(
            ['address', 'uint256[]', 'string[]'],
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
        for (let i = startId; i < startId + numberOfAssetERC721s; i++) {
          const uriL1 = await AssetERC721.tokenUris(i);
          const uriL2 = await PolygonAssetERC721.tokenUris(i);
          expect(uriL1).to.be.equal(uriL2);
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
