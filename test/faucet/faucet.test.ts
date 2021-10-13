import {setupFaucet} from './fixtures';
import {BigNumber} from 'ethers';
import {expectEventWithArgs, waitFor, setupUser} from '../utils';
import {expect} from '../chai-setup';

const DECIMALS_18 = BigNumber.from('1000000000000000000');
const TOTAL_SUPPLY = DECIMALS_18.mul(1000000);

describe('Faucet', function () {
  it('Receive cannot exceed Faucet approved amout', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, sandContract, sandBeneficiary, others} = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const user = await setupUser(others[4], {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(
        sandContract.address,
        TOTAL_SUPPLY
      )
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const ASKED_AMOUNT = DECIMALS_18.mul(11);

    await expect(user.faucetContract.send(ASKED_AMOUNT)).to.be.revertedWith(
      'Demand must not exceed 10000000000000000000'
    );
  });

  it('Receive cannot be executed twice without awaiting', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, sandContract, sandBeneficiary, others} = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const user = await setupUser(others[4], {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(
        faucetContract.address,
        TOTAL_SUPPLY
      )
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const ASKED_AMOUNT = DECIMALS_18.mul(2);

    await waitFor(user.faucetContract.send(ASKED_AMOUNT));

    await expect(user.faucetContract.send(ASKED_AMOUNT)).to.be.revertedWith(
      'After each call you must wait 30 seconds.'
    );
  });

  it('Receive cannot exceed Faucet amount limit', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, sandContract, sandBeneficiary, others} = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const user = await setupUser(others[4], {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(
        sandContract.address,
        TOTAL_SUPPLY
      )
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const ASKED_AMOUNT = DECIMALS_18.mul(11);

    await expect(user.faucetContract.send(ASKED_AMOUNT)).to.be.revertedWith(
      'Demand must not exceed 10000000000000000000'
    );
  });

  it('Receive succeded for correct asked amount', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, sandContract, sandBeneficiary, others} = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const user = await setupUser(others[4], {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(
        faucetContract.address,
        TOTAL_SUPPLY
      )
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const ASKED_AMOUNT = DECIMALS_18.mul(3);

    const receiveReceipt = await waitFor(
      user.faucetContract.send(ASKED_AMOUNT)
    );

    const receiveEvent = await expectEventWithArgs(
      faucetContract,
      receiveReceipt,
      'FaucetSent'
    );

    const balance = await sandContract.balanceOf(user.address);

    expect(receiveEvent.args[0]).to.equal(user.address); // receiver
    expect(receiveEvent.args[1]).to.equal(ASKED_AMOUNT.toString()); // amount

    expect(balance.toString()).to.equal(ASKED_AMOUNT.toString()); // amount
  });

  it('Retrieve succeded for deployer', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, deployer, sandContract, sandBeneficiary} = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const faucetDeployer = await setupUser(deployer, {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(
        faucetContract.address,
        TOTAL_SUPPLY
      )
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const receiveReceipt = await waitFor(
      faucetDeployer.faucetContract.retrieve(faucetDeployer.address)
    );

    const receiveEvent = await expectEventWithArgs(
      faucetContract,
      receiveReceipt,
      'FaucetRetrieved'
    );

    const balance = await sandContract.balanceOf(faucetDeployer.address);

    expect(receiveEvent.args[0]).to.equal(faucetDeployer.address); // receiver
    expect(receiveEvent.args[1]).to.equal(TOTAL_SUPPLY.toString()); // amount

    expect(balance.toString()).to.equal(TOTAL_SUPPLY.toString()); // amount
  });
});
