import {ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../chai-setup';
import {setupERC677} from './fixtures';

describe('ERC677Token', function () {
  it('Transfering tokens to ERC677Receiver contract should emit an OnTokenTransferEvent event', async function () {
    const {sand, tokenReceiver} = await setupERC677();
    const accounts = await getNamedAccounts();
    const fromBalanceBefore = await sand.balanceOf(accounts.deployer);
    console.log("the deployer address is ");
    console.log(accounts.deployer);
    console.log(fromBalanceBefore.toString());
    const bigFrom = BigNumber.from(fromBalanceBefore);
    const toBalanceBefore = await sand.balanceOf(tokenReceiver.address);
    console.log(toBalanceBefore.toString());
    const amount = BigNumber.from('100');
    const sub = bigFrom.sub(amount);
    console.log("amount " + amount);
    console.log(sub.toString());

    const balance = await sand.balanceOf(accounts.deployer);
    console.log("balance of deployer " + balance.toString());
    const tx = await sand
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(tokenReceiver.address, amount, Buffer.from('data'));
    await tx.wait();
    console.log(tx);
    const fromBalanceAfter = await sand.balanceOf(accounts.deployer);
    const toBalanceAfter = await sand.balanceOf(tokenReceiver.address);
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
    const {sand} = await setupERC677();
    const accounts = await getNamedAccounts();
    const fromBalanceBefore = await sand.balanceOf(accounts.deployer);
    const toBalanceBefore = await sand.balanceOf(accounts.sandAdmin);
    const amount = BigNumber.from('100000000000000000');
    const tx = await sand
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(accounts.sandAdmin, amount, Buffer.from('data'));
    await tx.wait();
    const fromBalanceAfter = await sand.balanceOf(accounts.deployer);
    const toBalanceAfter = await sand.balanceOf(accounts.sandAdmin);
    expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
    expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
  });
  it('Transfering tokens to a non receiver contract should fail', async function () {
    const {sand, emptyContract} = await setupERC677();
    const accounts = await getNamedAccounts();
    const toBalanceBefore = await sand.balanceOf(emptyContract.address);

    const amount = BigNumber.from('100000000000000000');
    await expect(
      sand
        .connect(ethers.provider.getSigner(accounts.deployer))
        .transferAndCall(emptyContract.address, amount, Buffer.from('data'))
    ).to.be.revertedWithoutReason(); // TODO: Maybe we must change the contract to get a message?
    const toBalanceAfter = await sand.balanceOf(emptyContract.address);
    expect(toBalanceAfter).to.equal(toBalanceBefore);
  });
  it('Transfering tokens to a contract with fallback function should succeed', async function () {
    const {sand, fallbackContract} = await setupERC677();
    const accounts = await getNamedAccounts();
    const toBalanceBefore = await sand.balanceOf(fallbackContract.address);
    const fromBalanceBefore = await sand.balanceOf(accounts.deployer);

    const amount = BigNumber.from('100000000000000000');
    await sand
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(fallbackContract.address, amount, Buffer.from('data'));
    const fromBalanceAfter = await sand.balanceOf(accounts.deployer);
    const toBalanceAfter = await sand.balanceOf(fallbackContract.address);
    expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
    expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
  });
});
