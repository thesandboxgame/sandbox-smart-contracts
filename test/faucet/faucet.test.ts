import {deployments, ethers} from 'hardhat';
import {setupFaucet} from './fixtures';
import {BigNumber, constants} from 'ethers';
import {splitSignature} from 'ethers/lib/utils';
import {expectEventWithArgs, waitFor, setupUser} from '../utils';
import {expect} from '../chai-setup';
import {data712} from './data712';

const zeroAddress = constants.AddressZero;
const DECIMALS_18 = BigNumber.from('1000000000000000000');
const TOTAL_SUPPLY = DECIMALS_18.mul(1000000);
const LIMIT_AMOUNT = DECIMALS_18.mul(1000);

describe('Faucet', function () {
  // Note: on test network, others[1] is sandAdmin, others[2] is sandBeneficiary

  before(async function () {
    await deployments.fixture();
  });

  it('Faucet FApproved event is emitted when sending funds to Faucet', async function () {
    const setUp = await setupFaucet();
    const {
      faucetContract,
      sandContract,
      sandBeneficiary,
      deployer,
      nonce,
      deadline,
    } = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(deployer, TOTAL_SUPPLY)
    );

    const transferEvent = await expectEventWithArgs(
      sandContract,
      transferReceipt,
      'Transfer'
    );

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    const approveReceipt = await waitFor(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const approvalEvent = await expectEventWithArgs(
      faucetContract,
      approveReceipt,
      'FApproved'
    );

    expect(transferEvent.args[0]).to.equal(sandBeneficiary); // sender
    expect(transferEvent.args[1]).to.equal(deployer); // owner
    expect(transferEvent.args[2]).to.equal(TOTAL_SUPPLY.toString()); // amount

    expect(approvalEvent.args[0]).to.equal(deployer); // sender
    expect(approvalEvent.args[1]).to.equal(LIMIT_AMOUNT); // amount
  });

  it('Nonce is incremented for each approve', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, deployer, nonce, deadline} = setUp;

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    const approveReceipt = await waitFor(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const approvalEvent = await expectEventWithArgs(
      faucetContract,
      approveReceipt,
      'FApproved'
    );

    const nonceAfterApproval = await faucetContract.nonces(deployer);
    expect(nonceAfterApproval).to.equal(1);

    expect(approvalEvent.args[0]).to.equal(deployer); // sender
    expect(approvalEvent.args[1]).to.equal(LIMIT_AMOUNT); // amount
  });

  it('Approve function on Faucet reverts if deadline has passed', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, deployer, nonce} = setUp;
    const deadline = BigNumber.from(1382718400);

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    await expect(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWith('PAST_DEADLINE');
  });

  it('Approve function on Faucet function reverts if owner is zeroAddress', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, deployer, nonce, deadline} = setUp;

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const approve = {
      owner: zeroAddress,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    await expect(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWith('INVALID_SIGNATURE');
  });

  it('Approve function on Faucet function reverts if sender is not the owner', async function () {
    const setUp = await setupFaucet();
    const {faucetContract, others, deployer, nonce, deadline} = setUp;

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      others[3],
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    await expect(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWith('INVALID_SIGNATURE');
  });

  it('Receive cannot exceed Faucet approved amout', async function () {
    const setUp = await setupFaucet();
    const {
      faucetContract,
      sandContract,
      sandBeneficiary,
      others,
      deployer,
      nonce,
      deadline,
    } = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(deployer, TOTAL_SUPPLY)
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    await waitFor(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const ASKED_AMOUNT = DECIMALS_18.mul(11);

    await expect(
      deployerUser.faucetContract.receive(others[4], ASKED_AMOUNT)
    ).to.be.revertedWith('Demand should not exceed limit');
  });

  it('Receive cannot be executed twice without awaiting', async function () {
    const setUp = await setupFaucet();
    const {
      faucetContract,
      sandContract,
      sandBeneficiary,
      others,
      deployer,
      nonce,
      deadline,
    } = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(deployer, TOTAL_SUPPLY)
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    await waitFor(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const ASKED_AMOUNT = DECIMALS_18.mul(2);

    await waitFor(deployerUser.faucetContract.receive(others[4], ASKED_AMOUNT));

    await expect(
      deployerUser.faucetContract.receive(others[4], ASKED_AMOUNT)
    ).to.be.revertedWith(
      'Demand not available now. You should wait after each Demand.'
    );
  });

  it('Receive cannot exceed Faucet total supply', async function () {
    const setUp = await setupFaucet();
    const {
      faucetContract,
      sandContract,
      sandBeneficiary,
      others,
      deployer,
      nonce,
      deadline,
    } = setUp;

    const totalSupply = DECIMALS_18.mul(5);

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(deployer, totalSupply)
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    await waitFor(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const ASKED_AMOUNT = DECIMALS_18.mul(6);

    const receiveReceipt = await waitFor(
      deployerUser.faucetContract.receive(others[4], ASKED_AMOUNT)
    );

    const receiveEvent = await expectEventWithArgs(
      faucetContract,
      receiveReceipt,
      'FSent'
    );

    expect(receiveEvent.args[0]).to.equal(others[4]); // receiver
    expect(receiveEvent.args[1]).to.equal(totalSupply.toString()); // amount
  });

  it('Receive succeded for correct asked amount', async function () {
    const setUp = await setupFaucet();
    const {
      faucetContract,
      sandContract,
      sandBeneficiary,
      others,
      deployer,
      nonce,
      deadline,
    } = setUp;

    const sandBeneficiaryUser = await setupUser(sandBeneficiary, {
      sandContract,
    });

    const deployerUser = await setupUser(deployer, {
      faucetContract,
    });

    const transferReceipt = await waitFor(
      sandBeneficiaryUser.sandContract.transfer(deployer, TOTAL_SUPPLY)
    );

    await expectEventWithArgs(sandContract, transferReceipt, 'Transfer');

    const approve = {
      owner: deployer,
      amount: LIMIT_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const faucetData712 = data712(faucetContract, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData_v4', [
      deployer,
      faucetData712,
    ]);
    const sig = splitSignature(flatSig);

    await waitFor(
      deployerUser.faucetContract.approve(
        LIMIT_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const ASKED_AMOUNT = DECIMALS_18.mul(3);

    const receiveReceipt = await waitFor(
      deployerUser.faucetContract.receive(others[4], ASKED_AMOUNT)
    );

    const receiveEvent = await expectEventWithArgs(
      faucetContract,
      receiveReceipt,
      'FSent'
    );
    const balance = await sandContract.balanceOf(others[4]);

    expect(receiveEvent.args[0]).to.equal(others[4]); // receiver
    expect(receiveEvent.args[1]).to.equal(ASKED_AMOUNT.toString()); // amount

    expect(balance.toString()).to.equal(ASKED_AMOUNT.toString()); // amount
  });
});
