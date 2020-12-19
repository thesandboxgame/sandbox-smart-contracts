import { ethers, getUnnamedAccounts } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from '../../chai-setup';
import { setupAssetAttributesRegistry } from './fixtures';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';

describe('AssetUpgrader', function () {

  it('daseas', async function () {
    // const { assetAttributesRegistry } = await setupAssetAttributesRegistry();
    // const record = await assetAttributesRegistry.getRecord(0);
    // expect(record.catalystId).to.equal(0);
    // expect(record.exists).to.equal(false);
    // expect(record.gemIds.length).to.equal(15);
  });

});
