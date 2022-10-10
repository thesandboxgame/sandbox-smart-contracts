import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {toWei, withSnapshot} from './utils';
import {expect} from './chai-setup';
import {AddressZero} from '@ethersproject/constants';

const withSnapshotSetup = withSnapshot([], async () => {
  const [src] = await getUnnamedAccounts();
  const {deployer} = await getNamedAccounts();
  const balance = await ethers.provider.getBalance(src);
  await deployments.deploy('CHILD_CHAIN_MANAGER', {
    contract: 'FakeChildChainManager',
    from: deployer,
    proxy: false,
  });
  const contract = await ethers.getContract('CHILD_CHAIN_MANAGER');
  return {balance, contract};
});
describe('use withSnapshot to keep your testing environment clean', function () {
  it("withSnapshot doesn't care about what happen before", async function () {
    await deployments.fixture(['CHILD_CHAIN_MANAGER']);
    const childChainManagerPre = await ethers.getContract(
      'CHILD_CHAIN_MANAGER'
    );
    const [src, dst, other] = await getUnnamedAccounts();
    // const initialBalance = await ethers.provider.getBalance(src);

    const signer = await ethers.getSigner(src);
    await signer.sendTransaction({
      from: src,
      to: dst,
      value: toWei('1'),
    });
    // Set something to be able to compare later
    await childChainManagerPre.setPolygonAsset(other);
    expect(await childChainManagerPre.polygonAsset()).to.be.equal(other);

    // A clean start...
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {contract, balance} = await withSnapshotSetup();
    expect(await contract.polygonAsset()).to.be.equal(AddressZero);
    // I don't know exactly the value of initialBalance, it depends on the hardhat config and the other tests.
    // TODO: We cant implement a revert to initial state right now, see the comment in withSnapshot
    // expect(balance.gte(initialBalance)).to.be.true;
  });
});
