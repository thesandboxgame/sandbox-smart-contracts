import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber} from 'ethers';

export const setupFaucet = deployments.createFixture(async function () {
  const {sandAdmin, sandBeneficiary, deployer} = await getNamedAccounts();

  const others = await getUnnamedAccounts();
  await deployments.fixture(['Sand', 'Faucet']);

  const sandContract = await ethers.getContract('Sand');
  const faucetContract = await ethers.getContract('Faucet');

  const nonce = BigNumber.from(0);
  const deadline = BigNumber.from(2582718400);

  return {
    faucetContract,
    sandContract,
    sandAdmin,
    sandBeneficiary,
    deployer,
    others,
    nonce,
    deadline,
  };
});
