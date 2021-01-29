import {ethers, getUnnamedAccounts, getNamedAccounts} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {BigNumber, Contract} from 'ethers';
import {expect} from '../../chai-setup';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';
import {setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';
import {setupAssetAttributesRegistry} from '../assetAttributesRegistry/fixtures';
import {setupAssetMinter} from './fixtures';
import {mintCatalyst, mintGem} from '../utils';
import {waitFor, expectEventWithArgs} from '../../utils';

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

type AssetData = {
  gemIds: number[];
  quantity: number;
  catalystId: number;
};

type MintMultiOptions = {
  from: Address;
  packId: BigNumber;
  metadataHash: string;
  gemsQuantities: number[];
  catalystsQuantities: number[];
  assets: AssetData[];
  to: Address;
  data: Buffer;
};
let mintMultiOptions: MintMultiOptions;

const packId = BigNumber.from('1');
const hash = ethers.utils.keccak256('0x42');
const catId = catalysts[1].catalystId;
const ids = [gems[0].gemId, gems[1].gemId];
const supply = 1;
const callData = Buffer.from('');

const METATX_2771 = 2;
const gemsCatalystsUnit = '1000000000000000000';

const NFT_SUPPLY = 1;
const FT_SUPPLY = 7;
const emptyRecordGemIds = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

describe('AssetMinter', function () {
  before(async function () {
    mintOptions = {
      from: ethers.constants.AddressZero,
      packId: packId,
      metaDataHash: hash,
      catalystId: catId,
      gemIds: ids,
      quantity: supply,
      rarity: 0,
      to: ethers.constants.AddressZero,
      data: callData,
    };

    mintMultiOptions = {
      from: ethers.constants.AddressZero,
      packId: packId,
      metadataHash: hash,
      gemsQuantities: [0, 0, 0, 0, 0, 0],
      catalystsQuantities: [0, 0, 0, 0, 0],
      assets: [],
      to: ethers.constants.AddressZero,
      data: callData,
    };
  });

  describe('AssetMinter: Mint', function () {
    // @note
    // minting single erc1155 w/ mint() (supply > 1) emits TransferSingle
    // minting multiple erc1155 w/ mintMultiple() (supplies.each > 1) emits TransferBatch

    it('Record is created with correct data on minting an NFT', async function () {
      const {assetMinterContract, assetContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      const {powerGem, commonCatalyst} = await setupGemsAndCatalysts();
      const isBouncer = await assetContract.isBouncer(
        assetMinterContract.address
      );
      // @note clean up
      expect(isBouncer).to.be.equal(true);
      const balanceCat = await commonCatalyst.balanceOf(catalystOwner);
      const balanceGem = await powerGem.balanceOf(catalystOwner);
      expect(BigNumber.from(balanceCat).div(gemsCatalystsUnit)).to.be.equal(8);
      expect(BigNumber.from(balanceGem).div(gemsCatalystsUnit)).to.be.equal(8);

      const assetId = await assetMinterAsCatalystOwner.callStatic.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[0].catalystId,
        [gems[0].gemId],
        NFT_SUPPLY,
        0,
        catalystOwner,
        mintOptions.data
      );

      await assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[0].catalystId,
        [gems[0].gemId],
        1,
        0,
        catalystOwner,
        mintOptions.data
      );

      const record = await assetAttributesRegistry.getRecord(assetId);
      expect(record.catalystId).to.equal(1);
      expect(record.exists).to.equal(true);
      expect(record.gemIds.length).to.equal(15);
      expect(record.gemIds[0]).to.equal(1);
    });

    it('only erc721 assets will have a catalyst set', async function () {
      const {assetMinterContract, assetContract} = await setupAssetMinter();
      const {
        catalystOwner,
        rareCatalyst,
        powerGem,
        defenseGem,
      } = await setupGemsAndCatalysts();
      const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await mintCatalyst(
        rareCatalyst,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        powerGem,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        defenseGem,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      const assetId = await assetMinterAsCatalystOwner.callStatic.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[1].catalystId,
        [gems[0].gemId, gems[1].gemId],
        FT_SUPPLY,
        0,
        catalystOwner,
        mintOptions.data
      );

      const receipt = await assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[1].catalystId,
        [gems[0].gemId, gems[1].gemId],
        FT_SUPPLY,
        0,
        catalystOwner,
        mintOptions.data
      );

      const mintEvent = await expectEventWithArgs(
        assetContract,
        receipt,
        'TransferSingle'
      );
      //  TransferSingle(operator, address(0), owner, id, supply);
      const args = mintEvent.args;

      expect(args[0]).to.be.equal(assetMinterContract.address);
      expect(args[1]).to.be.equal(ethers.constants.AddressZero);
      expect(args[2]).to.be.equal(catalystOwner);
      expect(args[3]).to.be.equal(assetId);
      expect(args[4]).to.be.equal(7);

      const record = await assetAttributesRegistry.getRecord(assetId);
      const balancesOfBatch = await assetContract.balanceOfBatch(
        [catalystOwner],
        [assetId]
      );

      expect(balancesOfBatch[0]).to.be.equal(FT_SUPPLY);
      // @review id here is currently 2. Should it be 0?
      // "Catalyst will only be associated to ERC721 Assets"
      // https://docs.google.com/document/d/1B_r6v3KA-kdtdPEQjpei2E2s0YObbo2mGWe1yGZIPt8/edit
      // expect(record.catalystId).to.be.equal(0);
      expect(record.exists).to.be.equal(true);
      // expect(record.gemIds).to.deep.equal(emptyRecordGemIds); // ?
      expect(record.gemIds[0]).to.be.equal(1);
      expect(record.gemIds[1]).to.be.equal(2);
    });

    it('Transfer event is emitted on minting an NFT', async function () {
      const {assetMinterContract, assetContract} = await setupAssetMinter();
      const {
        catalystOwner,
        rareCatalyst,
        powerGem,
        defenseGem,
      } = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCatalyst(
        rareCatalyst,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        powerGem,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        defenseGem,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      const assetId = await assetMinterAsCatalystOwner.callStatic.mint(
        catalystOwner,
        packId.add(1),
        mintOptions.metaDataHash,
        catalysts[1].catalystId,
        mintOptions.gemIds,
        NFT_SUPPLY,
        0,
        catalystOwner,
        mintOptions.data
      );

      const receipt = await assetMinterAsCatalystOwner.mint(
        catalystOwner,
        packId.add(1),
        mintOptions.metaDataHash,
        catalysts[1].catalystId,
        mintOptions.gemIds,
        NFT_SUPPLY,
        0,
        catalystOwner,
        mintOptions.data
      );

      const mintEvent = await expectEventWithArgs(
        assetContract,
        receipt,
        'Transfer'
      );
      const args = mintEvent.args;

      expect(args[0]).to.be.equal(ethers.constants.AddressZero);
      expect(args[1]).to.be.equal(catalystOwner);
      expect(args[2]).to.be.equal(assetId);
    });

    it('CatalystApplied event is emitted on minting an NFT with a catalyst', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {
        catalystOwner,
        rareCatalyst,
        powerGem,
        defenseGem,
      } = await setupGemsAndCatalysts();
      const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await mintCatalyst(
        rareCatalyst,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        powerGem,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        defenseGem,
        BigNumber.from('7').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      const metaDataHash = ethers.utils.keccak256('0x11111111');

      const receipt = await assetMinterAsCatalystOwner.mint(
        catalystOwner,
        packId,
        metaDataHash,
        mintOptions.catalystId,
        mintOptions.gemIds,
        NFT_SUPPLY,
        0,
        catalystOwner,
        mintOptions.data
      );

      const catalystEvent = await expectEventWithArgs(
        assetAttributesRegistry,
        receipt,
        'CatalystApplied'
      );
      const args = catalystEvent.args;

      expect(args[1]).to.be.equal(catalysts[1].catalystId);
      expect(args[2]).to.deep.equal(mintOptions.gemIds);
      expect(args[3]).to.be.equal(receipt.blockNumber + 1);
    });

    it('Catalysts and gems totalSuplies are reduced when added', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {
        legendaryCatalyst,
        defenseGem,
        speedGem,
        magicGem,
        powerGem,
        catalystOwner,
      } = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCatalyst(
        legendaryCatalyst,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        powerGem,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        defenseGem,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        speedGem,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        magicGem,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      const legendaryBalanceBefore = await legendaryCatalyst.balanceOf(
        catalystOwner
      );
      const speedBalanceBefore = await speedGem.balanceOf(catalystOwner);
      const defenseBalanceBefore = await defenseGem.balanceOf(catalystOwner);
      const powerBalanceBefore = await powerGem.balanceOf(catalystOwner);
      const magicBalanceBefore = await magicGem.balanceOf(catalystOwner);
      const legendaryTotalSupplyBefore = await legendaryCatalyst.totalSupply();
      const speedTotalSupplyBefore = await speedGem.totalSupply();
      const defenseTotalSupplyBefore = await defenseGem.totalSupply();
      const powerTotalSupplyBefore = await powerGem.totalSupply();
      const magicTotalSupplyBefore = await magicGem.totalSupply();

      await assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [gems[2].gemId, gems[3].gemId, gems[0].gemId, gems[1].gemId],
        1,
        0,
        catalystOwner,
        mintOptions.data
      );

      const legendaryBalanceAfter = await legendaryCatalyst.balanceOf(
        catalystOwner
      );
      const speedBalanceAfter = await speedGem.balanceOf(catalystOwner);
      const defenseBalanceAfter = await defenseGem.balanceOf(catalystOwner);
      const powerBalanceAfter = await powerGem.balanceOf(catalystOwner);
      const magicBalanceAfter = await magicGem.balanceOf(catalystOwner);
      const legendaryTotalSupplyAfter = await legendaryCatalyst.totalSupply();
      const speedTotalSupplyAfter = await speedGem.totalSupply();
      const defenseTotalSupplyAfter = await defenseGem.totalSupply();
      const powerTotalSupplyAfter = await powerGem.totalSupply();
      const magicTotalSupplyAfter = await magicGem.totalSupply();

      const oneToken = BigNumber.from(1).mul(gemsCatalystsUnit);

      expect(legendaryBalanceAfter).to.be.equal(
        legendaryBalanceBefore.sub(oneToken)
      );
      expect(speedBalanceAfter).to.be.equal(speedBalanceBefore.sub(oneToken));
      expect(defenseBalanceAfter).to.be.equal(
        defenseBalanceBefore.sub(oneToken)
      );
      expect(powerBalanceAfter).to.be.equal(powerBalanceBefore.sub(oneToken));
      expect(magicBalanceAfter).to.be.equal(magicBalanceBefore.sub(oneToken));
      expect(legendaryTotalSupplyAfter).to.be.equal(
        legendaryTotalSupplyBefore.sub(oneToken)
      );
      expect(speedTotalSupplyAfter).to.be.equal(
        speedTotalSupplyBefore.sub(oneToken)
      );
      expect(defenseTotalSupplyAfter).to.be.equal(
        defenseTotalSupplyBefore.sub(oneToken)
      );
      expect(powerTotalSupplyAfter).to.be.equal(
        powerTotalSupplyBefore.sub(oneToken)
      );
      expect(magicTotalSupplyAfter).to.be.equal(
        magicTotalSupplyBefore.sub(oneToken)
      );
    });
  });

  describe('AssetMinter: MintMultiple', function () {
    // For mintMultiple() success cases, test:
    // - operator can mint
    // - state: _records should be updated, use getAttributes to check
    it.skip('only erc721 assets will have a catalyst set', async function () {
      const {
        catalystOwner,
        powerGem,
        speedGem,
        commonCatalyst,
        rareCatalyst,
      } = await setupGemsAndCatalysts();
      const {assetMinterContract} = await setupAssetMinter();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
    });

    it.skip('TransferSingle event is emitted on minting a single FT', async function () {});

    it.skip('TransferBatch event is emitted on minting a multiple FTs', async function () {});

    it.skip('CatalystApplied event is emitted for each NFT minted with a catalyst', async function () {});

    it.skip('records should be updated correctly for each asset minted', async function () {});

    it.skip('totalSupply & balance should be reduced for burnt gems & catalysts', async function () {});

    it.skip('Extra gems will be burnt even if not added to asset', async function () {});

    it.skip('Extra catalysts will be burnt even if not added to asset', async function () {});
  });

  describe('AssetMinter: Failures', function () {
    it('should fail if "to" == address(0)', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
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
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
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
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
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
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
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
      const {assetMinterContract} = await setupAssetMinter();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
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
      const {assetMinterContract} = await setupAssetMinter();
      const {
        catalystOwner,
        commonCatalyst,
        powerGem,
        defenseGem,
      } = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await mintCatalyst(
        commonCatalyst,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        powerGem,
        BigNumber.from('2').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        defenseGem,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      await expect(
        assetMinterAsCatalystOwner.mint(
          catalystOwner,
          packId,
          mintOptions.metaDataHash,
          [catalysts[0].catalystId],
          [gems[0].gemId, gems[0].gemId, gems[1].gemId],
          NFT_SUPPLY,
          0,
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('GEMS_TOO_MANY');
    });

    it('mintMultiple should fail if assets.length == 0', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          mintMultiOptions.gemsQuantities,
          mintMultiOptions.catalystsQuantities,
          [],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_0_ASSETS');
    });

    it('mintMultiple should fail if catalystsQuantities == 0', async function () {
      const {
        catalystOwner,
        powerGem,
        speedGem,
        commonCatalyst,
        rareCatalyst,
      } = await setupGemsAndCatalysts();
      const {assetMinterContract} = await setupAssetMinter();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintGem(
        speedGem,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintGem(
        powerGem,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintCatalyst(
        commonCatalyst,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );
      await mintCatalyst(
        rareCatalyst,
        BigNumber.from('1').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          [0, 1, 0, 1, 0, 0],
          [0, 0, 0, 0, 0],
          [
            {
              gemIds: [1],
              quantity: 1,
              catalystId: 1,
            },
            {
              gemIds: [3],
              quantity: 1,
              catalystId: 2,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_CATALYST_NOT_ENOUGH');
    });

    it('mintMultiple should fail if gemsQuantities == 0', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          [],
          mintMultiOptions.catalystsQuantities,
          mintMultiOptions.assets,
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_0_ASSETS');
    });

    it('mintMultiple should fail if trying to add too many gems', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          [0, 3, 0, 0, 0, 0],
          [0, 1, 0, 0, 0],
          [
            {
              gemIds: [1, 1, 1],
              quantity: 1,
              catalystId: 1,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_GEMS_TOO_MANY');
    });

    it('mintMultiple should fail if trying to add too few gems', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          // only passing 2 powerGems in quantities, but adding 3 in assets[]
          [0, 1, 0, 0, 0, 0],
          [0, 0, 1, 0, 0],
          [
            {
              gemIds: [1, 1],
              quantity: 1,
              catalystId: 2,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_GEMS_NOT_ENOUGH');
    });

    it('should fail if gemsQuantities.length != 5', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          [0, 2],
          [0, 1, 0, 0, 0],
          [
            {
              gemIds: [5],
              quantity: 1,
              catalystId: 1,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.reverted; // Error: VM Exception while processing transaction: invalid opcode
    });
    it('should fail if catalystsQuantities.length != 4', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          [0, 2, 0, 0, 0],
          [0, 1],
          [
            {
              gemIds: [5],
              quantity: 1,
              catalystId: 1,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.reverted; // Error: VM Exception while processing transaction: invalid opcode
    });

    it('should fail if gemsQuantities are out of order', async function () {
      // The quantity of each gem must be at the index corresponding to the gemId. This requires a 0 value to pad the 0-index of the gemsQuantities array
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          [1, 0, 0, 0, 0],
          [0, 1, 0, 0, 0],
          [
            {
              gemIds: [1],
              quantity: 1,
              catalystId: 1,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_GEMS_NOT_ENOUGH');
    });
    it('should fail if catalystsQuantities are out of order', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {catalystOwner} = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultiple(
          catalystOwner,
          mintMultiOptions.packId,
          mintMultiOptions.metadataHash,
          [0, 1, 0, 0, 0, 0],
          [1, 0, 0, 0],
          [
            {
              gemIds: [1],
              quantity: 1,
              catalystId: 1,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_CATALYST_NOT_ENOUGH');
    });

    it('mintMultiple should not set catalyst if catalystId == 0', async function () {
      const {assetMinterContract, assetContract} = await setupAssetMinter();
      const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
      const {
        commonCatalyst,
        powerGem,
        catalystOwner,
      } = await setupGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintGem(
        powerGem,
        BigNumber.from('2').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      await mintCatalyst(
        commonCatalyst,
        BigNumber.from('2').mul(BigNumber.from(gemsCatalystsUnit)),
        catalystOwner
      );

      const staticIds = await assetMinterAsCatalystOwner.callStatic.mintMultiple(
        catalystOwner,
        mintMultiOptions.packId,
        mintMultiOptions.metadataHash,
        [0, 1, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [
          {
            gemIds: [1],
            quantity: 1,
            catalystId: 0,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const assetId = staticIds[0];

      const receipt = await assetMinterAsCatalystOwner.mintMultiple(
        catalystOwner,
        mintMultiOptions.packId,
        mintMultiOptions.metadataHash,
        [0, 1, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [
          {
            gemIds: [1],
            quantity: 1,
            catalystId: 0,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const {
        exists,
        catalystId,
        gemIds,
      } = await assetAttributesRegistry.getRecord(assetId);
      const assetOwner = await assetContract.ownerOf(assetId);
      expect(exists).to.be.equal(false);
      expect(catalystId).to.be.equal(0);
      expect(gemIds).to.deep.equal(emptyRecordGemIds);
      expect(assetOwner).to.be.equal(catalystOwner);

      const mintMultiEvent = await expectEventWithArgs(
        assetContract,
        receipt,
        'TransferBatch'
      );
      const args = mintMultiEvent.args;

      expect(args[0]).to.be.equal(assetMinterContract.address);
      expect(args[1]).to.be.equal(ethers.constants.AddressZero);
      expect(args[2]).to.be.equal(catalystOwner);
      expect(args[3]).to.deep.equal(staticIds);
      expect(args[4]).to.deep.equal([BigNumber.from(1)]);
    });
  });
});
