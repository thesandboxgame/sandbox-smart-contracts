import {ethers, deployments, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber, Wallet} from "ethers";

export const setupPermit = deployments.createFixture(async function () {
    const {sandAdmin, sandBeneficiary} = await getNamedAccounts();
    const others = await getUnnamedAccounts();
    await deployments.fixture('Permit');

    const sandContract = await ethers.getContract('Sand');
    const permitContract = await ethers.getContract('Permit');

    const wallet = Wallet.createRandom();
    const nonce = BigNumber.from(0);
    const deadline = BigNumber.from(2582718400);

  return {
    permitContract,
    sandContract,
    sandAdmin,
    sandBeneficiary,
    others,
    wallet,
    nonce,
    deadline
  };
});
