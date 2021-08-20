import {expect} from '../../chai-setup';
import {Fixtures, setupSand} from './fixtures';
import {AbiCoder} from 'ethers/lib/utils';
import {sendMetaTx} from '../../sendMetaTx';
import {expectEventWithArgsFromReceipt, toWei, waitFor} from '../../utils';
import {BigNumber, BigNumberish} from 'ethers';

const abiCoder = new AbiCoder();

// The only way to deposit in L2 is via the childChainManager
async function depositViaCildChainManager(
  fixtures: Fixtures,
  user: string,
  amount: BigNumberish
) {
  // Lock tokens on ERC20 predicate contract
  const pre = BigNumber.from(await fixtures.Sand.balanceOf(user));
  const data = abiCoder.encode(['uint256'], [amount.toString()]);
  await waitFor(
    fixtures.ChildChainManager.callSandDeposit(
      fixtures.Sand.address,
      user,
      data
    )
  );
  expect(await fixtures.Sand.balanceOf(user)).to.be.equal(pre.add(amount));
}

describe('PolygonSand.sol Meta TX', function () {
  let fixtures: Fixtures;
  let users: string[];
  beforeEach(async function () {
    fixtures = await setupSand();
    users = fixtures.users.map((x) => x.address);
    const amount = toWei(123);
    await depositViaCildChainManager(
      fixtures,
      fixtures.sandBeneficiary.address,
      amount
    );
  });
  describe('transfer', function () {
    it('without metatx', async function () {
      const amount = 123;
      const pre = BigNumber.from(await fixtures.Sand.balanceOf(users[0]));
      fixtures.sandBeneficiary.Sand.transfer(users[0], amount);
      expect(await fixtures.Sand.balanceOf(users[0])).to.be.equal(
        pre.add(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const pre = BigNumber.from(await fixtures.Sand.balanceOf(users[0]));

      const {data} = await fixtures.Sand.populateTransaction.transfer(
        users[0],
        amount
      );
      // users[3] pay for the gas, of a message signed by sandBeneficiary.
      const receipt = await sendMetaTx(
        fixtures.Sand.address,
        fixtures.users[3].TrustedForwarder,
        data,
        fixtures.sandBeneficiary.address
      );
      const event = await expectEventWithArgsFromReceipt(
        fixtures.TrustedForwarder,
        receipt,
        'TXResult'
      );

      expect(event.args.success).to.be.true;
      expect(await fixtures.Sand.balanceOf(users[0])).to.be.equal(
        pre.add(amount)
      );
    });
  });
});
