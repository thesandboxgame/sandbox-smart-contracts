import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {withSnapshot} from '../utils';

export const setupPermit = withSnapshot(['Permit'], async function () {
  const {sandAdmin, sandBeneficiary} = await getNamedAccounts();
  const others = await getUnnamedAccounts();

  const sandContract = await ethers.getContract('Sand');
  const permitContract = await ethers.getContract('Permit');

  const nonce = BigNumber.from(0);
  const deadline = BigNumber.from(2582718400);

  return {
    permitContract,
    sandContract,
    sandAdmin,
    sandBeneficiary,
    others,
    nonce,
    deadline,
  };
});
