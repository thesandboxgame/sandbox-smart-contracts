import {ethers} from 'hardhat';
import {expect} from '../../chai-setup';
import {setupLand} from './fixtures';
import {bufferToHex, rlp} from 'ethereumjs-util';
import MerkleTree from './utils/merkle-tree';
import {
  getTxBytes,
  getReceiptBytes,
  getReceiptProof,
  getTxProof,
  verifyTxProof,
} from './utils/proofs';
import {getBlockHeader} from './utils/blocks';

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
        const receipt = await tx.wait();

        // Emulate Checkpoint
        const block = await ethers.provider.getBlock(tx.blockHash);
        const event = {
          tx,
          receipt,
          block,
        };
        const checkpointData = await build(event);
        const root = bufferToHex(checkpointData.header.root);
        await deployer.CheckpointManager.setCheckpoint(
          root,
          tx.blockNumber,
          tx.blockNumber
        );

        console.log('moving on...');

        // Release on L1
        const logIndex = 0;
        const data = bufferToHex(
          rlp.encode([
            headerNumber,
            bufferToHex(Buffer.concat(checkpointData.proof)),
            checkpointData.number,
            checkpointData.timestamp,
            bufferToHex(checkpointData.transactionsRoot),
            bufferToHex(checkpointData.receiptsRoot),
            bufferToHex(checkpointData.receipt),
            bufferToHex(rlp.encode(checkpointData.receiptParentNodes)),
            bufferToHex(checkpointData.path),
            logIndex,
          ])
        );
        await deployer.LandTunnel.receiveMessage(data);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);
        expect(await Land.balanceOf(LandTunnel.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
      });
    });
  });
});

let headerNumber = 0;
async function build(event: any) {
  const blockHeader = getBlockHeader(event.block);
  const tree = new MerkleTree([blockHeader]);
  const receiptProof: any = await getReceiptProof(
    event.receipt,
    event.block,
    null /* web3 */,
    [event.receipt]
  );
  const blockTxns = [];
  for (let i = 0; i < event.block.transactions.length; i++) {
    const tx = await ethers.provider.getTransaction(
      event.block.transactions[i]
    );
    blockTxns.push(tx);
  }
  event.block.transactions = blockTxns;
  const txProof: any = await getTxProof(event.tx, event.block);
  console.log('TX PROOF');
  console.log(txProof);
  expect(verifyTxProof(receiptProof)).to.be.ok;

  headerNumber += 1;
  return {
    header: {
      number: headerNumber,
      root: tree.getRoot(),
      start: event.receipt.blockNumber,
    },
    receipt: getReceiptBytes(event.receipt), // rlp encoded
    receiptParentNodes: receiptProof.parentNodes,
    tx: getTxBytes(event.tx), // rlp encoded
    txParentNodes: txProof.parentNodes,
    path: Buffer.concat([Buffer.from('00', 'hex'), receiptProof.path]),
    number: event.receipt.blockNumber,
    timestamp: event.block.timestamp,
    transactionsRoot: Buffer.from(event.block.transactionsRoot.slice(2), 'hex'),
    receiptsRoot: Buffer.from(event.block.receiptsRoot.slice(2), 'hex'),
    proof: await tree.getProof(blockHeader),
  };
}
