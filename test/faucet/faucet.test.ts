import {setupFaucet} from './fixtures';
import {BigNumber} from 'ethers';
import {expectEventWithArgs, waitFor, setupUser} from '../utils';
import {expect} from '../chai-setup';

const DECIMALS_18 = BigNumber.from('1000000000000000000');
const TOTAL_SUPPLY = DECIMALS_18.mul(1000000);

describe('Faucet', function () {
  it('Send cannot exceed Faucet limit amout', async function () {
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

  it('Send cannot be executed twice without awaiting', async function () {
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

  it('Send succeded for correct asked amount', async function () {
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

  it('Retrieve succeded for deployer with any address', async function () {
    const setUp = await setupFaucet();
    const {
      faucetContract,
      deployer,
      sandContract,
      sandBeneficiary,
      others,
    } = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const faucetUser = await setupUser(others[4], {
      faucetContract,
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
      faucetDeployer.faucetContract.retrieve(faucetUser.address)
    );

    const receiveEvent = await expectEventWithArgs(
      faucetContract,
      receiveReceipt,
      'FaucetRetrieved'
    );

    const balance = await sandContract.balanceOf(faucetUser.address);

    expect(receiveEvent.args[0]).to.equal(faucetUser.address); // receiver
    expect(receiveEvent.args[1]).to.equal(TOTAL_SUPPLY.toString()); // amount

    expect(balance.toString()).to.equal(TOTAL_SUPPLY.toString()); // amount
  });

  it('Retrieve fail for user that is not deployer', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, others, sandContract, sandBeneficiary} = setUp;

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

    await expect(user.faucetContract.retrieve(user.address)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });

  it('setPeriod succeed for deployer', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, deployer} = setUp;

    const faucetDeployer = await setupUser(deployer, {
      faucetContract,
    });

    const periodReceipt = await waitFor(
      faucetDeployer.faucetContract.setPeriod(40)
    );

    const periodEvent = await expectEventWithArgs(
      faucetContract,
      periodReceipt,
      'FaucetPeriod'
    );

    const period = await faucetContract.getPeriod();

    expect(periodEvent.args[0]).to.equal(40); // amount
    expect(period).to.equal(40); // amount
  });

  it('setPeriod fail for user that is not deployer', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, others} = setUp;

    const user = await setupUser(others[4], {
      faucetContract,
    });

    await expect(user.faucetContract.setPeriod(40)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });

  it('setLimit succeed for deployer', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, deployer} = setUp;

    const faucetDeployer = await setupUser(deployer, {
      faucetContract,
    });

    const NEW_LIMIT = DECIMALS_18.mul(25);

    const limitReceipt = await waitFor(
      faucetDeployer.faucetContract.setLimit(NEW_LIMIT)
    );

    const limitEvent = await expectEventWithArgs(
      faucetContract,
      limitReceipt,
      'FaucetLimit'
    );

    const limit = await faucetContract.getLimit();

    expect(limitEvent.args[0]).to.equal(NEW_LIMIT); // amount
    expect(limit).to.equal(NEW_LIMIT); // amount
  });

  it('Send with new limit succeed after limit update.', async function () {
    const setUp = await setupFaucet();
    const {
      faucetContract,
      sandContract,
      sandBeneficiary,
      deployer,
      others,
    } = setUp;

    const faucetDeployer = await setupUser(deployer, {
      faucetContract,
    });

    const NEW_LIMIT = DECIMALS_18.mul(25);

    const limitReceipt = await waitFor(
      faucetDeployer.faucetContract.setLimit(NEW_LIMIT)
    );

    const limitEvent = await expectEventWithArgs(
      faucetContract,
      limitReceipt,
      'FaucetLimit'
    );

    const limit = await faucetContract.getLimit();

    expect(limitEvent.args[0]).to.equal(NEW_LIMIT); // amount
    expect(limit).to.equal(NEW_LIMIT); // amount

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

  it('setLimit fail for user that is not deployer', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, others} = setUp;

    const user = await setupUser(others[4], {
      faucetContract,
    });

    const NEW_LIMIT = DECIMALS_18.mul(25);

    await expect(user.faucetContract.setLimit(NEW_LIMIT)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });
});
