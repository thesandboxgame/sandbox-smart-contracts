import {expect} from '../chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Contract} from 'ethers';

const setupTest = deployments.createFixture(
  async (): Promise<{
    Sand: Contract;
    users: {
      address: string;
      Sand: Contract;
    }[];
  }> => {
    await deployments.fixture('Sand');
    const users = await getUnnamedAccounts();
    return {
      Sand: await ethers.getContract('Sand'),
      users: await Promise.all(
        users.map((acc: string) =>
          (async () => {
            return {
              address: acc,
              Sand: await ethers.getContract('Sand', acc),
            };
          })()
        )
      ),
    };
  }
);

describe('Sand', function () {
  it('calling it directly without pre-approval result in Allowance error', async function () {
    const {users} = await setupTest();
    await expect(
      users[0].Sand.transfer(users[1].address, 1)
    ).to.be.revertedWith('not enough fund');
  });
});
