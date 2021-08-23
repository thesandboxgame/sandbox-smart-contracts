import {expect} from '../../chai-setup';
import {Fixtures, setupSand} from './fixtures';
import {AbiCoder} from 'ethers/lib/utils';
import {sendMetaTx} from '../../sendMetaTx';
import {expectEventWithArgsFromReceipt, toWei, waitFor} from '../../utils';
import {BigNumber, BigNumberish, PopulatedTransaction} from 'ethers';

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

async function sendMeta(
  fixtures: Fixtures,
  signer: string,
  populatedTx: Promise<PopulatedTransaction>
) {
  const {data} = await populatedTx;
  // users[3] pay for the gas, of a message signed by signer.
  const receipt = await sendMetaTx(
    fixtures.Sand.address,
    fixtures.users[3].TrustedForwarder,
    data,
    signer
  );
  const event = await expectEventWithArgsFromReceipt(
    fixtures.TrustedForwarder,
    receipt,
    'TXResult'
  );
  expect(event.args.success).to.be.true;
}

describe('PolygonSand.sol Meta TX', function () {
  let fixtures: Fixtures;
  let users: string[];
  let sandBeneficiary: string;
  beforeEach(async function () {
    fixtures = await setupSand();
    sandBeneficiary = fixtures.sandBeneficiary.address;
    users = fixtures.users.map((x) => x.address);
    const amount = toWei(123);
    await depositViaCildChainManager(fixtures, sandBeneficiary, amount);
  });
  describe('transfer', function () {
    it('without metatx', async function () {
      const amount = 123;
      const pre = BigNumber.from(await fixtures.Sand.balanceOf(users[0]));
      await fixtures.sandBeneficiary.Sand.transfer(users[0], amount);
      expect(await fixtures.Sand.balanceOf(users[0])).to.be.equal(
        pre.add(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const pre = BigNumber.from(await fixtures.Sand.balanceOf(users[0]));

      // users[3] pay for the gas, of a message signed by sandBeneficiary.
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.Sand.populateTransaction.transfer(users[0], amount)
      );
      expect(await fixtures.Sand.balanceOf(users[0])).to.be.equal(
        pre.add(amount)
      );
    });
  });

  describe('approve and transferFrom', function () {
    it('without metatx', async function () {
      const amount = 123;
      const preBalance = BigNumber.from(
        await fixtures.Sand.balanceOf(users[0])
      );
      const preAllowance = BigNumber.from(
        await fixtures.Sand.allowance(sandBeneficiary, users[0])
      );
      fixtures.sandBeneficiary.Sand.approve(users[0], amount);
      expect(
        await fixtures.Sand.allowance(
          fixtures.sandBeneficiary.address,
          users[0]
        )
      ).to.be.equal(preAllowance.add(amount));
      fixtures.users[0].Sand.transferFrom(sandBeneficiary, users[0], amount);
      expect(await fixtures.Sand.balanceOf(users[0])).to.be.equal(
        preBalance.add(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const preBalance = BigNumber.from(
        await fixtures.Sand.balanceOf(users[0])
      );
      const preAllowance = BigNumber.from(
        await fixtures.Sand.allowance(sandBeneficiary, users[0])
      );
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.Sand.populateTransaction.approve(users[0], amount)
      );
      expect(
        await fixtures.Sand.allowance(
          fixtures.sandBeneficiary.address,
          users[0]
        )
      ).to.be.equal(preAllowance.add(amount));
      await sendMeta(
        fixtures,
        users[0],
        fixtures.Sand.populateTransaction.transferFrom(
          sandBeneficiary,
          users[0],
          amount
        )
      );
      expect(await fixtures.Sand.balanceOf(users[0])).to.be.equal(
        preBalance.add(amount)
      );
    });
  });

  describe('burn', function () {
    it('without metatx', async function () {
      const amount = 123;
      const preSupply = BigNumber.from(await fixtures.Sand.totalSupply());
      const pre = BigNumber.from(
        await fixtures.Sand.balanceOf(sandBeneficiary)
      );
      await fixtures.sandBeneficiary.Sand.burn(amount);
      expect(await fixtures.Sand.balanceOf(sandBeneficiary)).to.be.equal(
        pre.sub(amount)
      );
      expect(await fixtures.Sand.totalSupply()).to.be.equal(
        preSupply.sub(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const preSupply = BigNumber.from(await fixtures.Sand.totalSupply());
      const pre = BigNumber.from(
        await fixtures.Sand.balanceOf(sandBeneficiary)
      );
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.Sand.populateTransaction.burn(amount)
      );
      expect(await fixtures.Sand.balanceOf(sandBeneficiary)).to.be.equal(
        pre.sub(amount)
      );
      expect(await fixtures.Sand.totalSupply()).to.be.equal(
        preSupply.sub(amount)
      );
    });
  });

  describe('trusted forwarder', function () {
    it('should fail to set the trusted forwarder if not owner', async function () {
      await expect(
        fixtures.sandBeneficiary.Sand.setTrustedForwarder(users[3])
      ).to.revertedWith('caller is not the owner');
    });
    it('should success to set the trusted forwarder if owner', async function () {
      expect(await fixtures.sandBeneficiary.Sand.isTrustedForwarder(users[3]))
        .to.be.false;
      await fixtures.deployer.Sand.setTrustedForwarder(users[3]);
      expect(await fixtures.sandBeneficiary.Sand.isTrustedForwarder(users[3]))
        .to.be.true;
    });
  });
});
