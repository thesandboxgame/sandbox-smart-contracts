import {toWei, withSnapshot} from '../utils';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {zeroAddress} from '../land-sale/fixtures';
import {expect} from '../chai-setup';

const setupBatch = withSnapshot(['DeployerBatch_deploy'], async () => {
  const {deployer} = await getNamedAccounts();
  const contract = await ethers.getContract('DeployerBatch', deployer);
  await deployments.deploy('PayableMock', {
    from: deployer,
  });
  const payableMock = await ethers.getContract('PayableMock');
  const viewTx = await payableMock.populateTransaction.callME();
  const payableTx = await payableMock.populateTransaction.payME();
  return {
    deployer,
    contract,
    payableMock,
    payableTx: payableTx.data,
    viewTx: viewTx.data,
  };
});

describe('Batch.sol coverage', function () {
  it('atomicBatchWithETH', async function () {
    const {contract, payableTx, payableMock} = await setupBatch();
    await contract.atomicBatchWithETH(
      [{target: payableMock.address, callData: payableTx, value: 1}],
      {value: toWei(1)}
    );
    expect(await payableMock.called()).to.be.true;
  });

  it('nonAtomicBatchWithETH', async function () {
    const {contract, payableMock, payableTx} = await setupBatch();
    await contract.nonAtomicBatchWithETH(
      [{target: payableMock.address, callData: payableTx, value: 1}],
      {value: toWei(1)}
    );
    expect(await payableMock.called()).to.be.true;
  });

  it('atomicBatch', async function () {
    const {contract, payableMock, viewTx} = await setupBatch();
    await contract.atomicBatch([
      {target: payableMock.address, callData: viewTx},
    ]);
    expect(await payableMock.called()).to.be.true;
  });

  it('nonAtomicBatch', async function () {
    const {contract, payableMock, viewTx} = await setupBatch();
    await contract.nonAtomicBatch([
      {target: payableMock.address, callData: viewTx},
    ]);
    expect(await payableMock.called()).to.be.true;
  });

  it('singleTargetAtomicBatchWithETH', async function () {
    const {contract, payableTx, payableMock} = await setupBatch();
    await contract.singleTargetAtomicBatchWithETH(
      payableMock.address,
      [{callData: payableTx, value: 1}],
      {value: toWei(1)}
    );
    expect(await payableMock.called()).to.be.true;
  });

  it('singleTargetNonAtomicBatchWithETH', async function () {
    const {contract, payableMock, payableTx} = await setupBatch();
    await contract.singleTargetNonAtomicBatchWithETH(
      payableMock.address,
      [{callData: payableTx, value: 1}],
      {value: toWei(1)}
    );
    expect(await payableMock.called()).to.be.true;
  });

  it('singleTargetAtomicBatch', async function () {
    const {contract, payableMock, viewTx} = await setupBatch();
    await contract.singleTargetAtomicBatch(payableMock.address, [viewTx]);
    expect(await payableMock.called()).to.be.true;
  });

  it('singleTargetNonAtomicBatch', async function () {
    const {contract, payableMock, viewTx} = await setupBatch();
    await contract.singleTargetNonAtomicBatch(payableMock.address, [viewTx]);
    expect(await payableMock.called()).to.be.true;
  });

  it('onERC1155Received', async function () {
    const {contract} = await setupBatch();
    await contract.onERC1155Received(zeroAddress, zeroAddress, 0, 0, []);
  });

  it('onERC1155BatchReceived', async function () {
    const {contract} = await setupBatch();
    await contract.onERC1155BatchReceived(zeroAddress, zeroAddress, [], [], []);
  });

  it('onERC721Received', async function () {
    const {contract} = await setupBatch();
    await contract.onERC721Received(zeroAddress, zeroAddress, 0, []);
  });

  it('supportsInterface', async function () {
    const {contract} = await setupBatch();
    expect(await contract.supportsInterface('0x12345678')).to.be.false;
    expect(await contract.supportsInterface('0x01ffc9a7')).to.be.true;
    expect(await contract.supportsInterface('0x4e2312e0')).to.be.true;
    expect(await contract.supportsInterface('0x150b7a02')).to.be.true;
  });
});
