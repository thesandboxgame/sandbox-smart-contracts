import {ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../chai-setup';
import {setupERC677} from './fixtures';

describe('ERC677Token', function () {
  it('Transfering tokens to ERC677Receiver contract should emit an OnTokenTransferEvent event', async function () {
    const {gemToken, tokenReceiver} = await setupERC677();
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
    const {gemToken} = await setupERC677();
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
    const {gemToken, emptyContract} = await setupERC677();
    const accounts = await getNamedAccounts();
    const toBalanceBefore = await gemToken.balanceOf(emptyContract.address);

    const amount = BigNumber.from('100000000000000000');
    await expect(
      gemToken
        .connect(ethers.provider.getSigner(accounts.deployer))
        .transferAndCall(emptyContract.address, amount, Buffer.from('data'))
    ).to.be.revertedWith('');
    const toBalanceAfter = await gemToken.balanceOf(emptyContract.address);
    expect(toBalanceAfter).to.equal(toBalanceBefore);
  });
  it('Transfering tokens to a contract with fallback function should succeed', async function () {
    const {gemToken, fallbackContract} = await setupERC677();
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
