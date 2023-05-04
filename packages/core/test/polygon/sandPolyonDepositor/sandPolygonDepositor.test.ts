import {BigNumber} from 'ethers';
import {expect} from '../../chai-setup';
import {setupSandPolygonDepositor} from './fixtures';
import {waitFor} from '../../utils';
describe('SandPolygonDepositor', function () {
  it('Locking funds in sand predicate mock contract', async function () {
    const {
      sandPolygonDepositorContract,
      user0,
      sandContractAsUser0,
      sandContract,
      mockSandPredicateContract,
      mockRootChainManagerContract,
    } = await setupSandPolygonDepositor();
    const approvalAmount = BigNumber.from(5000).mul(`1000000000000000000`);
    const encodedABI = await sandPolygonDepositorContract.populateTransaction.depositToPolygon(
      user0,
      approvalAmount
    );
    expect(encodedABI.data).to.not.be.equal(undefined);
    if (encodedABI.data) {
      const user0BalanceBefore = await sandContract.balanceOf(user0);
      const predicateContractBalanceBefore = await sandContract.balanceOf(
        mockSandPredicateContract.address
      );
      await waitFor(
        sandContractAsUser0.approveAndCall(
          sandPolygonDepositorContract.address,
          approvalAmount,
          encodedABI.data
        )
      );
      const user0ApprovedAmount = await sandContract.allowance(
        user0,
        sandPolygonDepositorContract.address
      );
      const sandPolygonDepositorApprovedAmount = await sandContract.allowance(
        sandPolygonDepositorContract.address,
        mockRootChainManagerContract.address
      );
      const user0BalanceAfter = await sandContract.balanceOf(user0);
      const predicateContractBalanceAfter = await sandContract.balanceOf(
        mockSandPredicateContract.address
      );
      expect(user0BalanceAfter).to.be.equal(
        user0BalanceBefore.sub(approvalAmount)
      );
      expect(predicateContractBalanceAfter).to.be.equal(
        predicateContractBalanceBefore.add(approvalAmount)
      );
      expect(user0ApprovedAmount).to.be.equal(BigNumber.from(0));
      expect(sandPolygonDepositorApprovedAmount).to.be.equal(BigNumber.from(0));
    }
  });
});
