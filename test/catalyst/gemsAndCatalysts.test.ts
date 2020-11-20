import { ethers, getNamedAccounts } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from '../chai-setup';
import { setupGemsAndCatalysts } from './fixtures';
describe('GemsAndCatalysts', function () {
  it('', async function () {
    const { gemToken, tokenReceiver } = await setupGemsAndCatalysts();
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
});
