import {expect} from 'chai';
import {withSnapshot} from '../../utils';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {Event} from '@ethersproject/contracts/lib/index';

const fixtures = withSnapshot([], async function () {
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('SuccessAndRevertTest', {from: deployer});
  return await ethers.getContract('SuccessAndRevertTest', deployer);
});
describe('success and revert', function () {
  // eslint-disable-next-line mocha/no-skipped-tests
  describe.skip('Invalid', function () {
    it('to.be.ok never works, it checks for truthy and tx is truthy, when the contract revert it fails', async function () {
      const contract = await fixtures();
      // this doesn't check anything, tx is always returned
      expect(await contract.success()).to.be.ok;
      expect(await contract.explode()).to.be.ok;
    });
    it('to.be.not.reverted catches the error but it is cause the test to fail and we loose the error message', async function () {
      const contract = await fixtures();
      await expect(await contract.explode()).to.be.not.reverted;
    });
    it('awaiting for the Assertion result (it is not a promise), AsyncAssertion is a promise but we have no use case for that', async function () {
      const contract = await fixtures();
      await expect(contract.explode()).to.be.ok;
      await expect(contract.explode()).to.be.not.reverted;
    });
    it('forgetting to await', async function () {
      const contract = await fixtures();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      expect(contract.explode()).to.be.revertedWith('PUM');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      expect(contract.success()).to.be.equal(0);
    });
    it('to.throw only works for sync functions', async function () {
      const contract = await fixtures();
      await expect(await contract.explode()).to.throw('PUM');
    });
  });
  describe('Valid', function () {
    describe('Success, it is impossible to get the result of an external method off-chain, the only way is getting the event data', function () {
      it('by hand', async function () {
        const contract = await fixtures();
        const receipt = await (await contract.success()).wait();
        // unnecessary, ethersjs already did it.
        expect(receipt.status).to.be.equal(1);

        const resultEvents = receipt.events.filter(
          (v: Event) => v.event === 'ResultEvent'
        );
        expect(resultEvents.length).to.be.equal(2);
        expect(resultEvents[0].args['counter']).to.be.equal(1);
        expect(resultEvents[1].args['counter']).to.be.equal(10);
        const resultEvent2 = receipt.events.find(
          (v: Event) => v.event === 'ResultEvent2'
        );
        expect(resultEvent2.args['counter']).to.be.equal(1);
      });
      describe('waffle matchers', function () {
        it('success take one event', async function () {
          const contract = await fixtures();
          await expect(contract.success())
            .to.emit(contract, 'ResultEvent')
            .withArgs(1);
        });
        it('success multiple events', async function () {
          const contract = await fixtures();
          // contract.success() return a promise
          const txAssertion = expect(contract.success());
          // emit calls contract.provider.getTransactionReceipt(tx.hash) on promise.then
          await txAssertion.to.emit(contract, 'ResultEvent2').withArgs(1);
          const emitAssertion = txAssertion.to.emit(contract, 'ResultEvent');
          await emitAssertion.withArgs(1);
          await emitAssertion.withArgs(10);
        });
      });
    });
    describe('Revert, if the tx is valid it is accepted by the node (even if it will be reverted later). Ethersjs waits for the receipt, when a call is reverted receipt.status==0 and ethersjs throws on the js side for us', function () {
      it('we can catch by hand', async function () {
        const contract = await fixtures();
        try {
          await contract.explode();
        } catch (err) {
          expect(err.message).to.contain('PUM');
        }
      });
      it('with waffle matchers', async function () {
        const contract = await fixtures();
        await expect(contract.explode()).to.be.revertedWith('PUM');
        // be careful revertedWith uses a very flexible regexp in some versions
        await expect(contract.explode()).to.be.revertedWith('.*');
      });
    });
  });
});
