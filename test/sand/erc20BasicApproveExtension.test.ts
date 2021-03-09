import {ethers} from 'hardhat';
import {setupERC20BasicApproveExtension} from './fixtures';
import {BigNumber, constants} from 'ethers';
import {splitSignature, zeroPad, _TypedDataEncoder} from 'ethers/lib/utils';
import {
  expectEventWithArgs,
  expectReceiptEventWithArgs,
  waitFor,
} from '../utils';
import {expect} from '../chai-setup';
import {transferSand} from '../catalyst/utils';

const zeroAddress = constants.AddressZero;
function zeroPadding(s: string) {
  return '0'.repeat(64 - s.length) + s;
}
describe('ERC20BasicApproveExtension', function () {
  it('Should fail for input data too short', async function () {
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
  it('Should fail for first parameter != sender', async function () {
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
  it('Should fail for Approving the zeroAddress', async function () {
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

  it('ApproveAndCall should work for target = EOA', async function () {
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
    const res = await sandContract.callStatic.approveAndCall(
      user1,
      approvalAmount,
      Buffer.from(data, 'hex')
    );
    await waitFor(
      sandContractAsUser0.approveAndCall(
        user1,
        approvalAmount,
        Buffer.from(data, 'hex')
      )
    );
  });
});
