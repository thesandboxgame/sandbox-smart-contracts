import { ethers, getNamedAccounts } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from '../chai-setup';
import { setupGemsAndCatalysts } from './fixtures';
describe('GemsAndCatalysts', function () {
  it('', async function () {
    const { gemsAndCatalysts } = await setupGemsAndCatalysts();

  });
});
