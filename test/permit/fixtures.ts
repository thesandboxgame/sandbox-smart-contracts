import {ethers, deployments, getNamedAccounts, getUnnamedAccounts} from 'hardhat';

export const setupPermit = deployments.createFixture(async function () {
    const {sandAdmin, sandBeneficiary} = await getNamedAccounts();
    const others = await getUnnamedAccounts();
    await deployments.fixture('Permit');

    const sandContract = await ethers.getContract('Sand');
    const permitContract = await ethers.getContract('Permit');

  return {
    permitContract,
    sandContract,
    sandAdmin,
    sandBeneficiary,
    others,
  };
});
