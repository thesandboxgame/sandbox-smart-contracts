import {setupEstate} from './fixtures';
import {waitFor} from '../utils';
import {expect} from '../chai-setup';

describe('Estate.sol', function () {
  it('Can read the chainIndex from the tokenId', async function () {
    const {Estate, users, mintEstate} = await setupEstate();
    const chainIndex = await Estate.chainIndex(tokenId);
  });
});
