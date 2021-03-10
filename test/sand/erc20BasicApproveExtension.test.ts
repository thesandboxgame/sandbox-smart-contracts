import {ethers} from 'hardhat';
import {setupERC20BasicApproveExtension} from './fixtures';
import {BigNumber, constants, Contract} from 'ethers';
import {toWei} from '../utils';
import {expect} from '../chai-setup';
import {transferSand} from '../catalyst/utils';

const zeroAddress = constants.AddressZero;

function zeroPadding(s: string) {
  return '0'.repeat(64 - s.length) + s;
}

async function testFunction(
  sandContract: Contract,
  senderAddress: string,
  targetAddress: string,
  approvalAmount: BigNumber,
  senderEthBalanceBefore: BigNumber,
  targetEthBalanceBefore: BigNumber,
  txValue: BigNumber,
  txFee: BigNumber,
  expectedReturnData: string,
  returnData: string
) {
  const allowance = await sandContract.allowance(senderAddress, targetAddress);
  const senderEthBalanceAfter = await ethers.provider.getBalance(senderAddress);
  const targetEthBalanceAfter = await ethers.provider.getBalance(targetAddress);
  expect(targetEthBalanceAfter).to.equal(targetEthBalanceBefore.add(txValue));
  expect(senderEthBalanceAfter).to.equal(
    senderEthBalanceBefore.sub(txValue).sub(txFee)
  );
  expect(allowance).to.equal(approvalAmount);
  expect(returnData.toLowerCase()).to.equal(expectedReturnData.toLowerCase());
}

describe('ERC20BasicApproveExtension', function () {
  it('ApproveAndCall should fail for input data too short', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const data = `${function4BytesId}`;
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.approveAndCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`first param != sender`);
  });
  it('ApproveAndCall should fail for first parameter != sender', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
      user1,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedAddress = zeroPadding(user1.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedAddress}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.approveAndCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`first param != sender`);
  });
  it('ApproveAndCall should fail for zero data', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const data = zeroPadding('0');
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.approveAndCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`first param != sender`);
  });
  it('ApproveAndCall should fail for Approving the zeroAddress', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.approveAndCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`Cannot approve with 0x0`);
  });
  it('ApproveAndCall should work for target = EOA with ether value = 1', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
      user1,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    const senderEthBalanceBefore = await ethers.provider.getBalance(user0);
    const targetEthBalanceBefore = await ethers.provider.getBalance(user1);
    const txValue = toWei(1);
    const returnData = await sandContract.callStatic.approveAndCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex')
    );
    const tx = await sandContractAsUser0.approveAndCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex'),
      {value: txValue}
    );
    const receipt = await tx.wait();
    const txFee = tx.gasPrice.mul(receipt.gasUsed);

    await testFunction(
      sandContract,
      user0,
      user1,
      approvalAmount,
      senderEthBalanceBefore,
      targetEthBalanceBefore,
      txValue,
      txFee,
      '0x',
      returnData
    );
  });
  it('ApproveAndCall should work for target = EOA with ether value = 0', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
      user1,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    const senderEthBalanceBefore = await ethers.provider.getBalance(user0);
    const targetEthBalanceBefore = await ethers.provider.getBalance(user1);
    const txValue = toWei(0);
    const returnData = await sandContract.callStatic.approveAndCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex')
    );
    const tx = await sandContractAsUser0.approveAndCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex'),
      {value: txValue}
    );
    const receipt = await tx.wait();
    const txFee = tx.gasPrice.mul(receipt.gasUsed);

    await testFunction(
      sandContract,
      user0,
      user1,
      approvalAmount,
      senderEthBalanceBefore,
      targetEthBalanceBefore,
      txValue,
      txFee,
      '0x',
      returnData
    );
  });
  it('ApproveAndCall for an empty contract as a target should revert', async function () {
    const {
      emptyContract,
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    const txValue = toWei(0);

    await expect(
      sandContractAsUser0.approveAndCall(
        emptyContract.address,
        approvalAmount,
        Buffer.from(data, 'hex'),
        {value: txValue}
      )
    ).to.be.reverted;
  });
  it('ApproveAndCall calling logOnCall of a mock contract', async function () {
    const {
      mockERC20BasicApprovalTarget,
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const encodedABI = await mockERC20BasicApprovalTarget.populateTransaction.logOnCall(
      user0
    );
    const senderEthBalanceBefore = await ethers.provider.getBalance(user0);
    const targetEthBalanceBefore = await ethers.provider.getBalance(
      mockERC20BasicApprovalTarget.address
    );
    if (encodedABI.data) {
      const function4BytesId = encodedABI.data.substring(2, 10);
      const paddedMsgSender = zeroPadding(user0.substring(2));
      const paddedZeros = zeroPadding('0');
      const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
      await transferSand(sandContract, user0, totalSandBalance);

      const txValue = toWei(0);

      const returnData = await sandContract.callStatic.approveAndCall(
        mockERC20BasicApprovalTarget.address,
        approvalAmount,
        Buffer.from(data, 'hex')
      );

      const tx = await sandContractAsUser0.approveAndCall(
        mockERC20BasicApprovalTarget.address,
        approvalAmount,
        Buffer.from(data, 'hex'),
        {value: txValue}
      );
      const receipt = await tx.wait();
      const txFee = tx.gasPrice.mul(receipt.gasUsed);

      const events = await mockERC20BasicApprovalTarget.queryFilter(
        mockERC20BasicApprovalTarget.filters.LogOnCall()
      );
      const event = events.filter((e) => e.event === 'LogOnCall')[0];
      expect(event.args).not.to.equal(null || undefined);
      if (event.args) {
        expect(event.args[0]).to.equal(user0);
      }
      await testFunction(
        sandContract,
        user0,
        mockERC20BasicApprovalTarget.address,
        approvalAmount,
        senderEthBalanceBefore,
        targetEthBalanceBefore,
        txValue,
        txFee,
        '0x' + paddedMsgSender,
        returnData
      );
    }
  });
  it('ApproveAndCall calling revertOnCall of a mock contract should fail', async function () {
    const {
      mockERC20BasicApprovalTarget,
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const encodedABI = await mockERC20BasicApprovalTarget.populateTransaction.revertOnCall(
      user0
    );
    if (encodedABI.data) {
      const function4BytesId = encodedABI.data.substring(2, 10);
      const paddedMsgSender = zeroPadding(user0.substring(2));
      const paddedZeros = zeroPadding('0');
      const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
      await transferSand(sandContract, user0, totalSandBalance);

      const txValue = toWei(0);
      expect(
        sandContractAsUser0.approveAndCall(
          mockERC20BasicApprovalTarget.address,
          approvalAmount,
          Buffer.from(data, 'hex'),
          {value: txValue}
        )
      ).to.be.revertedWith('REVERT_ON_CALL');
    }
  });
  it('ApproveAndCall calling buyLandWithSand', async function () {
    const {
      estateSaleContract,
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const encodedABI = await estateSaleContract.populateTransaction.buyLandWithSand(
      user0
    );
    if (encodedABI.data) {
      const function4BytesId = encodedABI.data.substring(2, 10);
      const paddedMsgSender = zeroPadding(user0.substring(2));
      const paddedZeros = zeroPadding('0');
      const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
      await transferSand(sandContract, user0, totalSandBalance);

      const txValue = toWei(0);
      expect(
        sandContractAsUser0.approveAndCall(
          estateSaleContract.address,
          approvalAmount,
          Buffer.from(data, 'hex'),
          {value: txValue}
        )
      ).to.be.revertedWith('REVERT_ON_CALL');
    }
  });
  it('PaidCall should fail for input data too short', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const data = `${function4BytesId}`;
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.paidCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`first param != sender`);
  });
  it('PaidCall should fail for first parameter != sender', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
      user1,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedAddress = zeroPadding(user1.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedAddress}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.paidCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`first param != sender`);
  });
  it('PaidCall should fail for zero data', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const data = zeroPadding('0');
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.paidCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`first param != sender`);
  });
  it('PaidCall should fail for Approving the zeroAddress', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    await expect(
      sandContractAsUser0.paidCall(
        zeroAddress,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    ).to.be.revertedWith(`Cannot approve with 0x0`);
  });
  it('PaidCall should work for target = EOA with ether value = 1', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
      user1,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    const senderEthBalanceBefore = await ethers.provider.getBalance(user0);
    const targetEthBalanceBefore = await ethers.provider.getBalance(user1);
    const txValue = toWei(1);
    const returnData = await sandContract.callStatic.paidCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex')
    );
    const tx = await sandContractAsUser0.paidCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex'),
      {value: txValue}
    );
    const receipt = await tx.wait();
    const txFee = tx.gasPrice.mul(receipt.gasUsed);

    await testFunction(
      sandContract,
      user0,
      user1,
      approvalAmount,
      senderEthBalanceBefore,
      targetEthBalanceBefore,
      txValue,
      txFee,
      '0x',
      returnData
    );
  });
  it('PaidCall should work for target = EOA with ether value = 0', async function () {
    const {
      sandContractAsUser0,
      sandContract,
      user0,
      user1,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    const senderEthBalanceBefore = await ethers.provider.getBalance(user0);
    const targetEthBalanceBefore = await ethers.provider.getBalance(user1);
    const txValue = toWei(0);
    const returnData = await sandContract.callStatic.paidCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex')
    );
    const tx = await sandContractAsUser0.paidCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex'),
      {value: txValue}
    );
    const receipt = await tx.wait();
    const txFee = tx.gasPrice.mul(receipt.gasUsed);

    await testFunction(
      sandContract,
      user0,
      user1,
      approvalAmount,
      senderEthBalanceBefore,
      targetEthBalanceBefore,
      txValue,
      txFee,
      '0x',
      returnData
    );
  });
  it('PaidCall for an empty contract as a target should revert', async function () {
    const {
      emptyContract,
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const function4BytesId = '11111111';
    const paddedMsgSender = zeroPadding(user0.substring(2));
    const paddedZeros = zeroPadding('0');
    const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
    await transferSand(sandContract, user0, totalSandBalance);
    const txValue = toWei(0);

    await expect(
      sandContractAsUser0.paidCall(
        emptyContract.address,
        approvalAmount,
        Buffer.from(data, 'hex'),
        {value: txValue}
      )
    ).to.be.reverted;
  });
  it('PaidCall calling logOnCall of a mock contract', async function () {
    const {
      mockERC20BasicApprovalTarget,
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const encodedABI = await mockERC20BasicApprovalTarget.populateTransaction.logOnCall(
      user0
    );
    const senderEthBalanceBefore = await ethers.provider.getBalance(user0);
    const targetEthBalanceBefore = await ethers.provider.getBalance(
      mockERC20BasicApprovalTarget.address
    );
    if (encodedABI.data) {
      const function4BytesId = encodedABI.data.substring(2, 10);
      const paddedMsgSender = zeroPadding(user0.substring(2));
      const paddedZeros = zeroPadding('0');
      const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
      await transferSand(sandContract, user0, totalSandBalance);

      const txValue = toWei(0);

      const returnData = await sandContract.callStatic.paidCall(
        mockERC20BasicApprovalTarget.address,
        approvalAmount,
        Buffer.from(data, 'hex')
      );

      const tx = await sandContractAsUser0.paidCall(
        mockERC20BasicApprovalTarget.address,
        approvalAmount,
        Buffer.from(data, 'hex'),
        {value: txValue}
      );
      const receipt = await tx.wait();
      const txFee = tx.gasPrice.mul(receipt.gasUsed);

      const events = await mockERC20BasicApprovalTarget.queryFilter(
        mockERC20BasicApprovalTarget.filters.LogOnCall()
      );
      const event = events.filter((e) => e.event === 'LogOnCall')[0];
      expect(event.args).not.to.equal(null || undefined);
      if (event.args) {
        expect(event.args[0]).to.equal(user0);
      }

      await testFunction(
        sandContract,
        user0,
        mockERC20BasicApprovalTarget.address,
        approvalAmount,
        senderEthBalanceBefore,
        targetEthBalanceBefore,
        txValue,
        txFee,
        '0x' + paddedMsgSender,
        returnData
      );
    }
  });
  it('PaidCall calling revertOnCall of a mock contract should fail', async function () {
    const {
      mockERC20BasicApprovalTarget,
      sandContractAsUser0,
      sandContract,
      user0,
    } = await setupERC20BasicApproveExtension();
    const totalSandBalance = BigNumber.from(100000).mul(`1000000000000000000`);
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const encodedABI = await mockERC20BasicApprovalTarget.populateTransaction.revertOnCall(
      user0
    );
    if (encodedABI.data) {
      const function4BytesId = encodedABI.data.substring(2, 10);
      const paddedMsgSender = zeroPadding(user0.substring(2));
      const paddedZeros = zeroPadding('0');
      const data = `${function4BytesId}${paddedMsgSender}${paddedZeros}`;
      await transferSand(sandContract, user0, totalSandBalance);

      const txValue = toWei(0);
      expect(
        sandContractAsUser0.paidCall(
          mockERC20BasicApprovalTarget.address,
          approvalAmount,
          Buffer.from(data, 'hex'),
          {value: txValue}
        )
      ).to.be.revertedWith('REVERT_ON_CALL');
    }
  });
});
