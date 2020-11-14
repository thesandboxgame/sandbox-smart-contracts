import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from '../chai-setup';
import { Contract } from 'ethers';

describe('ERC677Token', function () {


  let tokenReceiver: Contract;
  let gemToken: Contract;
  let emptyContract: Contract;
  let fallbackContract: Contract;

  async function createFixture() {
    await deployments.fixture();
    const accounts = await getNamedAccounts();
    gemToken = await ethers.getContract('Gem_Power');
    await deployments.deploy('MockERC677Receiver', {
      from: accounts.deployer,
      args: [],
    });
    tokenReceiver = await ethers.getContract('MockERC677Receiver');
    await deployments.deploy('EmptyContract', {
      from: accounts.deployer,
      args: [],
    });
    emptyContract = await ethers.getContract('EmptyContract');
    await deployments.deploy('FallBackContract', {
      from: accounts.deployer,
      args: [],
    });
    fallbackContract = await ethers.getContract('FallBackContract');
    const tx = await gemToken
      .connect(ethers.provider.getSigner(accounts.deployer))
      .mint(accounts.deployer, BigNumber.from('800000000000000000'));
    await tx.wait();
  }

  it('Transfering tokens to ERC677Receiver contract should emit an OnTokenTransferEvent event', async function () {
    await createFixture();
    const accounts = await getNamedAccounts();
    const fromBalanceBefore = await gemToken.balanceOf(accounts.deployer);
    const toBalanceBefore = await gemToken.balanceOf(tokenReceiver.address);
    const amount = BigNumber.from('100000000000000000');
    const tx = await gemToken
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(tokenReceiver.address, amount, Buffer.from('data'));
    await tx.wait();
    const fromBalanceAfter = await gemToken.balanceOf(accounts.deployer);
    const toBalanceAfter = await gemToken.balanceOf(tokenReceiver.address);
    const tokenReceiverEvents = await tokenReceiver.queryFilter(
      tokenReceiver.filters.OnTokenTransferEvent()
    );
    const event = tokenReceiverEvents.filter(
      (e) => e.event === 'OnTokenTransferEvent'
    )[0];
    expect(event.args).not.to.equal(null || undefined);
    if (event.args) {
      expect(event.args[0].toLowerCase()).to.equal(
        accounts.deployer.toLowerCase()
      );
      expect(event.args[1]).to.equal(amount);
      expect(event.args[2]).to.equal('0x64617461');
      expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
      expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
    }
  });
  it('Transfering tokens to EOA', async function () {
    await createFixture();
    const accounts = await getNamedAccounts();
    const fromBalanceBefore = await gemToken.balanceOf(accounts.deployer);
    const toBalanceBefore = await gemToken.balanceOf(accounts.sandAdmin);
    const amount = BigNumber.from('100000000000000000');
    const tx = await gemToken
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(accounts.sandAdmin, amount, Buffer.from('data'));
    await tx.wait();
    const fromBalanceAfter = await gemToken.balanceOf(accounts.deployer);
    const toBalanceAfter = await gemToken.balanceOf(accounts.sandAdmin);
    expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
    expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
  });
  it('Transfering tokens to a non receiver contract should fail', async function () {
    await createFixture();
    const accounts = await getNamedAccounts();
    const toBalanceBefore = await gemToken.balanceOf(emptyContract.address);

    const amount = BigNumber.from('100000000000000000');
    expect(
      gemToken
        .connect(ethers.provider.getSigner(accounts.deployer))
        .transferAndCall(emptyContract.address, amount, Buffer.from('data'))
    ).to.be.revertedWith('');
    const toBalanceAfter = await gemToken.balanceOf(emptyContract.address);
    expect(toBalanceAfter).to.equal(toBalanceBefore);
  });
  it('Transfering tokens to a contract with fallback function should succeed', async function () {
    await createFixture();
    const accounts = await getNamedAccounts();
    const toBalanceBefore = await gemToken.balanceOf(fallbackContract.address);
    const fromBalanceBefore = await gemToken.balanceOf(accounts.deployer);

    const amount = BigNumber.from('100000000000000000');
    gemToken
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(fallbackContract.address, amount, Buffer.from('data'));
    const fromBalanceAfter = await gemToken.balanceOf(accounts.deployer);
    const toBalanceAfter = await gemToken.balanceOf(fallbackContract.address);
    expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
    expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
  });
});
