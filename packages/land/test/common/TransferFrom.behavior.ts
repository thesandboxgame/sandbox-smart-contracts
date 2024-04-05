import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckTransferFrom(setupLand, Contract: string) {
  describe(Contract + ':transferFrom', function () {
    it('Transfer 1x1 with approval', async function () {
      const {LandContract, LandAsOther, LandAsMinter, deployer, other} =
        await loadFixture(setupLand);

      const bytes = '0x3333';
      await LandAsMinter.mintQuad(other, 1, 0, 0, bytes);

      await LandAsOther.approve(deployer, 0);

      await LandContract.transferFrom(other, deployer, 0);
      const num1 = await LandContract.balanceOf(other);
      expect(num1).to.equal(0);
      const num2 = await LandContract.balanceOf(deployer);
      expect(num2).to.equal(1);
    });
  });

  describe(Contract + ':batchTransferFrom', function () {
    it('Mint 12x12 and transfer all internals 1x1s from it', async function () {
      const {LandContract, LandAsMinter, deployer, other} =
        await loadFixture(setupLand);

      const bytes = '0x3333';
      await LandAsMinter.mintQuad(deployer, 12, 0, 0, bytes);

      await LandContract.batchTransferFrom(
        deployer,
        other,
        [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 419, 418, 417, 416, 415, 414,
          413, 412, 411, 410, 409, 408, 816, 817, 818, 819, 820, 821, 822, 823,
          824, 825, 826, 827, 1235, 1234, 1233, 1232, 1231, 1230, 1229, 1228,
          1227, 1226, 1225, 1224, 1632, 1633, 1634, 1635, 1636, 1637, 1638,
          1639, 1640, 1641, 1642, 1643, 2051, 2050, 2049, 2048, 2047, 2046,
          2045, 2044, 2043, 2042, 2041, 2040, 2448, 2449, 2450, 2451, 2452,
          2453, 2454, 2455, 2456, 2457, 2458, 2459, 2867, 2866, 2865, 2864,
          2863, 2862, 2861, 2860, 2859, 2858, 2857, 2856, 3264, 3265, 3266,
          3267, 3268, 3269, 3270, 3271, 3272, 3273, 3274, 3275, 3683, 3682,
          3681, 3680, 3679, 3678, 3677, 3676, 3675, 3674, 3673, 3672, 4080,
          4081, 4082, 4083, 4084, 4085, 4086, 4087, 4088, 4089, 4090, 4091,
          4499, 4498, 4497, 4496, 4495, 4494, 4493, 4492, 4491, 4490, 4489,
          4488,
        ],
        bytes,
      );
      const num1 = await LandContract.balanceOf(deployer);
      expect(num1).to.equal(0);
      const num2 = await LandContract.balanceOf(other);
      expect(num2).to.equal(144);
    });
  });
}
