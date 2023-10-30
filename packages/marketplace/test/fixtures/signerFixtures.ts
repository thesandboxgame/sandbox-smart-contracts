import {ethers} from 'hardhat';

export async function runSignerSetup() {
  const [deployer, admin, user, defaultFeeReceiver, user1, user2] =
    await ethers.getSigners();

  return {
    deployer,
    admin,
    user,
    defaultFeeReceiver,
    user1,
    user2,
  };
}
