import {BigNumber} from 'ethers';
import {expect} from '../../chai-setup';
import {setupPolygonSandClaim} from './fixtures';
import {waitFor} from '../../utils';
import {ethers} from 'hardhat';

describe('PolygonSandClaim', function () {
  it('fetches the given amount of fake sand from user and transfers the same amount of new sand', async function () {
    const {
      sandAdmin,
      polygonSand,
      fakePolygonSand,
      polygonSandClaim,
    } = await setupPolygonSandClaim();

    const userFakeSandBalanceBefore = await fakePolygonSand.balanceOf(
      sandAdmin
    );
    const claimContractFakeSandBalanceBefore = await fakePolygonSand.balanceOf(
      polygonSandClaim.address
    );
    const userSandBalanceBefore = await polygonSand.balanceOf(sandAdmin);
    const claimContractSandBalanceBefore = await polygonSand.balanceOf(
      polygonSandClaim.address
    );

    expect(claimContractSandBalanceBefore).to.be.equal(
      BigNumber.from('3000000000000000000000000000')
    );
    expect(claimContractFakeSandBalanceBefore).to.be.equal(BigNumber.from(0));
    expect(userSandBalanceBefore).to.be.equal(BigNumber.from(0));
    expect(userFakeSandBalanceBefore).to.be.equal(
      BigNumber.from('1500000000000000000000000000')
    );

    await waitFor(
      polygonSandClaim
        .connect(ethers.provider.getSigner(sandAdmin))
        .claim(userFakeSandBalanceBefore)
    );

    const userFakeSandBalanceAfter = await fakePolygonSand.balanceOf(sandAdmin);
    const claimContractFakeSandBalanceAfter = await fakePolygonSand.balanceOf(
      polygonSandClaim.address
    );
    const userSandBalanceAfter = await polygonSand.balanceOf(sandAdmin);
    const claimContractSandBalanceAfter = await polygonSand.balanceOf(
      polygonSandClaim.address
    );

    expect(userFakeSandBalanceAfter).to.be.equal(BigNumber.from(0));
    expect(claimContractFakeSandBalanceAfter).to.be.equal(
      BigNumber.from('1500000000000000000000000000')
    );
    expect(userSandBalanceAfter).to.be.equal(
      BigNumber.from('1500000000000000000000000000')
    );
    expect(claimContractSandBalanceAfter).to.be.equal(
      BigNumber.from('1500000000000000000000000000')
    );
  });

  it('reverts if claim amount is more than balance', async function () {
    const {
      sandAdmin,
      polygonSand,
      polygonSandClaim,
    } = await setupPolygonSandClaim();

    const claimContractFakeSandBalance = await polygonSand.balanceOf(
      polygonSandClaim.address
    );

    await expect(
      polygonSandClaim
        .connect(ethers.provider.getSigner(sandAdmin))
        .claim(claimContractFakeSandBalance.add(1))
    ).to.be.revertedWith('Not enough sand for claim');
  });

  // Getters

  it('returns the amount of sand which has been claimed', async function () {
    const {
      deployer,
      sandAdmin,
      fakePolygonSand,
      polygonSandClaim,
    } = await setupPolygonSandClaim();

    await waitFor(
      polygonSandClaim
        .connect(ethers.provider.getSigner(sandAdmin))
        .claim(BigNumber.from('1500000000000000000000000000'))
    );

    const claimedBalance = await polygonSandClaim
      .connect(ethers.provider.getSigner(deployer))
      .claimedSand();

    const fakeSandBalance = await fakePolygonSand.balanceOf(
      polygonSandClaim.address
    );

    expect(claimedBalance).to.be.equal(fakeSandBalance);
  });
});
