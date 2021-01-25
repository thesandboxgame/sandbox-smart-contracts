import {ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../../chai-setup';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';
import {setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';
import {setupAssetMinter} from './fixtures';

describe('AssetMinter', function () {
  describe('AssetMinter: Mint', function () {
    it('initial test', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner, rareCatalyst} = await setupGemsAndCatalysts();
      const packId = BigNumber.from('1');
      const metaDataHash = ethers.utils.keccak256('0x42');
      const catalystId = catalysts[1].catalystId;
      const gemsIds = [gems[0].gemId, gems[1].gemId];
      const quantity = 1;
      const callData = Buffer.from('');
      const balance = await rareCatalyst.balanceOf(catalystOwner);
      await assetMinterContract
        .connect(ethers.provider.getSigner(catalystOwner))
        .mint(
          catalystOwner,
          packId,
          metaDataHash,
          catalystId,
          gemsIds,
          quantity,
          catalystOwner,
          callData
        );
      const record = await assetMinter.getRecord(0);
      expect(record.catalystId).to.equal(0);
      expect(record.exists).to.equal(false);
      expect(record.gemIds.length).to.equal(15);
    });
    describe('AssetMinter: Failures', function () {
      it('should fail if "to" == address(0)', async function () {});
      it('should fail if "from" != msg.sender && processorType == 0', async function () {});
      it('should fail if "from" == _forceMsgSender() && processorType == METATX_2771', async function () {});
      it('should fail if catalyst == Catalyst(0)', async function () {});
      it('should fail if gem == Gem(0)', async function () {});

      it('should fail if msg.sender != minter', async function () {});
      it('should fail if gemIds.length > MAX_NUM_GEMS', async function () {});
      it('should fail if gemIds.length > maxGems', async function () {});
    });
  });
  describe('AssetMinter: MintMultiple', function () {});
});
