import {ethers} from 'hardhat';

export async function signerSetup() {
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
