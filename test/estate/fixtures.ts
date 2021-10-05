import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';
import {Address} from 'hardhat-deploy/dist/types';
import {BigNumber} from '@ethersproject/bignumber';
import {setupUser, withSnapshot} from '../utils';

type User = {address: string; childEstateTokenV1: Contract};
export type Fixtures = {
  deployer: User;
  trustedForwarder: Contract;
  landContract: Contract;
  chainIndex: BigNumber;
  childEstateTokenV1: Contract;
  others: string[];
  accounts: {[name: string]: Address};
};
export const setupFixtures = withSnapshot(
  ['Land', 'TRUSTED_FORWARDER'],
  async function () {
    const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER');
    const landContract: Contract = await ethers.getContract('Land');
    const accounts = await getNamedAccounts();
    const others = await getUnnamedAccounts();
    await deployments.deploy('ChildEstateTokenV1', {
      from: accounts.deployer,
      args: [],
    });
    const childEstateTokenV1 = await ethers.getContract('ChildEstateTokenV1');
    const chainIndex = BigNumber.from(213);
    await childEstateTokenV1.initV1(
      trustedForwarder.address,
      landContract.address,
      chainIndex
    );
    const deployer = await setupUser(accounts.deployer, {
      childEstateTokenV1,
      trustedForwarder,
    });
    return {
      deployer,
      trustedForwarder,
      landContract,
      chainIndex,
      childEstateTokenV1,
      others,
      accounts,
    };
  }
);
