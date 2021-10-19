import {BigNumber} from 'ethers';
import {expect} from '../../chai-setup';
import {setupPolygonSandBatchDeposit} from './fixtures';
import {waitFor} from '../../utils';
import {ethers} from 'hardhat';

describe('PolygonSandBatchDeposit', function () {
  it('mints given amount of tokens to corresponding holder on PolygonSandContract', async function () {
    const {
      deployer,
      sandAdmin,
      polygonSandContract,
      polygonSandBatchDepositContract,
    } = await setupPolygonSandBatchDeposit();

    const mintAmount = BigNumber.from(1).mul(`1000000000000000000`);
    const holders = [deployer, sandAdmin];
    const values = [mintAmount, mintAmount];

    const user0BalanceBefore = await polygonSandContract.balanceOf(deployer);
    const user1BalanceBefore = await polygonSandContract.balanceOf(sandAdmin);
    expect(user0BalanceBefore).to.be.equal(BigNumber.from(0));
    expect(user1BalanceBefore).to.be.equal(BigNumber.from(0));

    await waitFor(
      polygonSandBatchDepositContract
        .connect(ethers.provider.getSigner(deployer))
        .batchMint(holders, values)
    );

    const user0BalanceAfter = await polygonSandContract.balanceOf(deployer);
    const user1BalanceAfter = await polygonSandContract.balanceOf(sandAdmin);
    expect(user0BalanceAfter).to.be.equal(mintAmount);
    expect(user1BalanceAfter).to.be.equal(mintAmount);
  });

  it('reverts batchMint if caller in not owner', async function () {
    const {
      deployer,
      polygonSandBatchDepositContract,
    } = await setupPolygonSandBatchDeposit();

    const holders = [deployer];
    const values = [BigNumber.from(1).mul(`1000000000000000000`)];

    await expect(
      polygonSandBatchDepositContract.batchMint(holders, values)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
});
