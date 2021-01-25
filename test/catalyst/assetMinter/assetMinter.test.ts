import {ethers, getUnnamedAccounts, getNamedAccounts} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {BigNumber, Contract} from 'ethers';
// import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../../chai-setup';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';
import {setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';
import {setupAssetAttributesRegistry} from '../assetAttributesRegistry/fixtures';
import {setupAssetMinter} from './fixtures';
import {isAddress} from 'ethers/lib/utils';
import {mintCatalyst, mintGem} from '../utils';

type MintOptions = {
  from: Address;
  packId: BigNumber;
  metaDataHash: string;
  catalystId: number;
  gemIds: number[];
  quantity: number;
  rarity: number;
  to: Address;
  data: Buffer;
};
let mintOptions: MintOptions;

const packId = BigNumber.from('1');
const hash = ethers.utils.keccak256('0x42');
const catalyst = catalysts[1].catalystId;
const ids = [gems[0].gemId, gems[1].gemId];
const supply = 1;
const callData = Buffer.from('');

const METATX_2771 = 2;
const gemsCatalystsUnit = '1000000000000000000';

describe('AssetMinter', function () {
  before(async function () {
    const {catalystOwner, rareCatalyst} = await setupGemsAndCatalysts();
    mintOptions = {
      from: ethers.constants.AddressZero,
      packId: packId,
      metaDataHash: hash,
      catalystId: catalyst,
      gemIds: ids,
      quantity: supply,
      rarity: 0,
      to: ethers.constants.AddressZero,
      data: callData,
    };
  });

  describe('AssetMinter: Mint', function () {
    let assetMinterContract: Contract;
    let assetMinterAsCatalystOwner: Contract;

    before(async function () {
      ({assetMinterContract} = await setupAssetMinter());
      const {catalystOwner, rareCatalyst} = await setupGemsAndCatalysts();
      const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
      const balance = await rareCatalyst.balanceOf(catalystOwner);
      expect(balance).to.be.equal(8);

      assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        mintOptions.catalystId,
        mintOptions.gemIds,
        mintOptions.quantity,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      );
      const record = await assetAttributesRegistry.getRecord(0);
      expect(record.catalystId).to.equal(0);
      expect(record.exists).to.equal(false);
      expect(record.gemIds.length).to.equal(15);
    });
  });
  describe('AssetMinter: MintMultiple', function () {});

  describe('AssetMinter: Failures', function () {
    let assetMinterContract: Contract;
    let assetMinterAsCatalystOwner: Contract;
    let catalystOwner: Address;

    before(async function () {
      ({assetMinterContract} = await setupAssetMinter());
      ({catalystOwner} = await setupGemsAndCatalysts());
      assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
    });

    it('should fail if "to" == address(0)', async function () {
      await expect(
        assetMinterAsCatalystOwner.mint(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          mintOptions.gemIds,
          mintOptions.quantity,
          mintOptions.rarity,
          mintOptions.to,
          mintOptions.data
        )
      ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
    });

    it('should fail if "from" != msg.sender && processorType == 0', async function () {
      const {assetMinterAdmin} = await getNamedAccounts();
      const users = await getUnnamedAccounts();
      const assetMinterAsAdmin = await assetMinterContract.connect(
        ethers.provider.getSigner(assetMinterAdmin)
      );
      await assetMinterAsAdmin.setMetaTransactionProcessor(users[9], 0);
      const assetMinterAsMetaTxProcessor = await assetMinterContract.connect(
        ethers.provider.getSigner(users[9])
      );
      await expect(
        assetMinterAsMetaTxProcessor.mint(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          mintOptions.gemIds,
          mintOptions.quantity,
          mintOptions.rarity,
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('INVALID_SENDER');
    });

    it('should fail if processorType == METATX_2771 && "from" != _forceMsgSender()', async function () {
      const {assetMinterAdmin} = await getNamedAccounts();
      const users = await getUnnamedAccounts();
      const assetMinterAsAdmin = await assetMinterContract.connect(
        ethers.provider.getSigner(assetMinterAdmin)
      );
      await assetMinterAsAdmin.setMetaTransactionProcessor(
        users[9],
        METATX_2771
      );
      const assetMinterAsMetaTxProcessor = await assetMinterContract.connect(
        ethers.provider.getSigner(users[9])
      );
      await expect(
        assetMinterAsMetaTxProcessor.mint(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          mintOptions.gemIds,
          mintOptions.quantity,
          mintOptions.rarity,
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('INVALID_SENDER');
    });

    it('should fail if gem == Gem(0)', async function () {
      await expect(
        assetMinterAsCatalystOwner.mint(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          [0, gems[1].gemId],
          mintOptions.quantity,
          mintOptions.rarity,
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('GEM_DOES_NOT_EXIST');
    });

    it('should fail if gemIds.length > MAX_NUM_GEMS', async function () {
      const {
        catalystOwner,
        rareCatalyst,
        luckGem,
      } = await setupGemsAndCatalysts();
      await mintCatalyst(
        rareCatalyst,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        luckGem,
        BigNumber.from('17').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      const catBalance = await rareCatalyst.balanceOf(catalystOwner);
      const gemBalance = await luckGem.balanceOf(catalystOwner);
      console.log(`balance here: ${catBalance}`);
      console.log(`gem balance here: ${gemBalance}`);
      await expect(
        assetMinterAsCatalystOwner.mint(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
          mintOptions.quantity,
          mintOptions.rarity,
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('GEMS_MAX_REACHED');
    });

    it('should fail if gemIds.length > maxGems', async function () {
      const {
        catalystOwner,
        rareCatalyst,
        powerGem,
      } = await setupGemsAndCatalysts();
      await mintGem(
        powerGem,
        BigNumber.from('4').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await expect(
        assetMinterAsCatalystOwner.mint(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          [gems[0].gemId, gems[0].gemId, gems[0].gemId, gems[0].gemId],
          mintOptions.quantity,
          mintOptions.rarity,
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('GEMS_TOO_MANY');
    });

    it.skip('mintMultiple should fail if assets.length == 0', async function () {});

    it.skip('mintMultiple should fail catalystsQuantities == 0', async function () {});

    it.skip('mintMultiple should fail if gemsQuantities == 0', async function () {});

    it.skip('mintMultiple should fail if trying to add too many gems', async function () {});
  });
});
