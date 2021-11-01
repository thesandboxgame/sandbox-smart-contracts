import {expect} from '../../chai-setup';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {Address} from 'hardhat-deploy/dist/types';
import {Contract} from 'ethers';
import {withSnapshot} from '../../utils';

describe('SafeMathWithRequire.sol library via MockSafeMathWithRequire.sol', function () {
  let fixtures: {
    accounts: {[name: string]: Address};
    mockSafeMathWithRequire: Contract;
  };
  before(async function () {
    fixtures = await withSnapshot([], async function () {
      const accounts = await getNamedAccounts();
      await deployments.deploy('MockSafeMathWithRequire', {
        from: accounts.deployer,
        args: [],
      });
      const mockSafeMathWithRequire = await ethers.getContract(
        'MockSafeMathWithRequire'
      );
      return {
        accounts,
        mockSafeMathWithRequire,
      };
    })();
  });
  it('sqrt6, sqrt multiplied by 1e6', async function () {
    expect(await fixtures.mockSafeMathWithRequire.sqrt6(25)).to.be.equal(
      5 * 1000000
    );
  });
  it('sqrt3, sqrt multiplied by 1e3', async function () {
    expect(await fixtures.mockSafeMathWithRequire.sqrt3(25)).to.be.equal(
      5 * 1000
    );
  });
  it('cbrt6, cube root multiplied by 1e6', async function () {
    expect(await fixtures.mockSafeMathWithRequire.cbrt6(125)).to.be.equal(
      5000000
    );
  });
  it('cbrt3, cube root multiplied by 1e3', async function () {
    expect(await fixtures.mockSafeMathWithRequire.cbrt3(125)).to.be.equal(5000);
  });
});
