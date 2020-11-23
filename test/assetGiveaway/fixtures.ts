import {
  ethers,
  deployments,
  // getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

export const setupGiveaway = deployments.createFixture(async function () {
  // const {sandAdmin, sandBeneficiary} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('NFT_Lottery_1');

  const giveawayContract = await ethers.getContract('NFT_Lottery_1');

  return {
    giveawayContract,
    others,
  };
});
