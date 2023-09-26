import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {withSnapshot} from '../utils';

export const setupFaucet = withSnapshot(['Faucet'], async function () {
  const {sandAdmin, sandBeneficiary, deployer} = await getNamedAccounts();
  const others = await getUnnamedAccounts();

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
