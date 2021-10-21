import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {BigNumber, Contract} from 'ethers';
import {expect} from '../../../chai-setup';
import catalysts from '../../../../data/catalysts';
import gems from '../../../../data/gems';
import {
  setupAssetMinter,
  setupAssetMinterAttributesRegistryGemsAndCatalysts,
  setupAssetMinterGemsAndCatalysts,
  setupAssetMinterUpgraderGemsAndCatalysts,
} from './fixtures';
import {mintCatalyst, mintGem, transferSand} from '../utils';
import {expectEventWithArgs, findEvents, waitFor} from '../../../utils';

const packId = BigNumber.from('1');
const hash = ethers.utils.keccak256('0x42');
const catId = catalysts[1].catalystId;
const catalystNFT = catalysts[3].catalystId;
const ids = [gems[0].gemId, gems[1].gemId];
const supply = 1;
const callData = Buffer.from('');
const testQuantity = BigNumber.from('0x42');
const artEnum = 0;
const propEnum = 1;

const gemsCatalystsUnit = '1000000000000000000';

const oneToken = BigNumber.from(1).mul(gemsCatalystsUnit);
const mintOptions = {
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

function bn(x: number): BigNumber {
  return BigNumber.from(x);
}

const mintMultiOptions = {
  from: ethers.constants.AddressZero,
  packId: packId,
  metadataHash: hash,
  gemsQuantities: [0, 0, 0, 0, 0, 0],
  catalystsQuantities: [0, 0, 0, 0, 0],
  assets: [],
  to: ethers.constants.AddressZero,
  data: callData,
};

type MintObj = {
  contract: Contract;
  amount: number;
  recipient: Address;
};

async function mintCats(mintObjects: MintObj[]): Promise<void> {
  for (const obj of mintObjects) {
    await mintCatalyst(
      obj.contract,
      BigNumber.from(obj.amount.toString()).mul(
        BigNumber.from(gemsCatalystsUnit)
      ),
      obj.recipient
    );
  }
}

async function mintGems(mintObjects: MintObj[]): Promise<void> {
  for (const obj of mintObjects) {
    await mintGem(
      obj.contract,
      BigNumber.from(obj.amount.toString()).mul(
        BigNumber.from(gemsCatalystsUnit)
      ),
      obj.recipient
    );
  }
}

describe('AssetMinter', function () {
  describe('AssetMinter: Mint', function () {
    it('the assetMInterAdmin is set correctly', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {assetMinterAdmin} = await getNamedAccounts();
      const minterAdmin = await assetMinterContract.getAdmin();
      expect(minterAdmin).to.equal(assetMinterAdmin);
    });

    it('the assetMinter quantities are set correctly', async function () {
      const {
        assetMinterContractAsOwner,
        assetMinterContract,
      } = await setupAssetMinter();

      await assetMinterContractAsOwner.setCommonQuantity(testQuantity);
      await assetMinterContractAsOwner.setRareQuantity(testQuantity);
      await assetMinterContractAsOwner.setEpicQuantity(testQuantity);
      await assetMinterContractAsOwner.setLegendaryQuantity(testQuantity);
      await assetMinterContractAsOwner.setNumberOfGemsBurnPerAsset(
        testQuantity
      );
      await assetMinterContractAsOwner.setNumberOfCatalystBurnPerAsset(
        testQuantity
      );
      await assetMinterContractAsOwner.setArtQuantity(testQuantity);
      await assetMinterContractAsOwner.setPropQuantity(testQuantity);
      await assetMinterContractAsOwner.setGemUnitWhenBurning(testQuantity);
      await assetMinterContractAsOwner.setCatalystUnitWhenBurning(testQuantity);

      // const currentOwner = await read('DefaultProxyAdmin', 'owner')
      expect(await assetMinterContract.artQuantity()).to.equal(testQuantity);
      expect(await assetMinterContract.propQuantity()).to.equal(testQuantity);
      expect(await assetMinterContract.commonQuantity()).to.equal(testQuantity);
      expect(await assetMinterContract.rareQuantity()).to.equal(testQuantity);
      expect(await assetMinterContract.epicQuantity()).to.equal(testQuantity);
      expect(await assetMinterContract.legendaryQuantity()).to.equal(
        testQuantity
      );
      expect(await assetMinterContract.numberOfGemsBurnPerAsset()).to.equal(
        testQuantity
      );
      expect(await assetMinterContract.numberOfCatalystBurnPerAsset()).to.equal(
        testQuantity
      );
      expect(await assetMinterContract.gemUnitWhenBurning()).to.equal(
        testQuantity
      );
      expect(await assetMinterContract.catalystUnitWhenBurning()).to.equal(
        testQuantity
      );
    });

    it('Record is created with correct data on minting with legendary catalyst (NFT)', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        commonCatalyst,
        powerGem,
        assetAttributesRegistry,
        assetContract,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 1, recipient: catalystOwner},
      ]);

      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [gems[0].gemId],
        catalystOwner,
        mintOptions.data
      );

      await assetMinterAsCatalystOwner.mintWithCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [gems[0].gemId],
        catalystOwner,
        mintOptions.data
      );
      const balance = await assetContract['balanceOf(address,uint256)'](
        catalystOwner,
        assetId
      );
      expect(balance).to.equal(await assetMinterContract.legendaryQuantity());

      const record = await assetAttributesRegistry.getRecord(assetId);
      expect(record.catalystId).to.equal(catalysts[3].catalystId);
      expect(record.exists).to.equal(true);
      expect(record.gemIds.length).to.equal(15);
      expect(record.gemIds[0]).to.equal(gems[0].gemId);
    });

    it('Transfer event is emitted on minting an NFT (catalyst legendary)', async function () {
      const {
        assetMinterContract,
        assetContract,
        catalystOwner,
        rareCatalyst,
        powerGem,
        defenseGem,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: rareCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 1, recipient: catalystOwner},
        {contract: defenseGem, amount: 1, recipient: catalystOwner},
      ]);

      // only legendary catalyst can mint NFT (catalysts[3].catalystId)
      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithCatalyst(
        catalystOwner,
        packId.add(1),
        mintOptions.metaDataHash,
        catalystNFT,
        mintOptions.gemIds,
        catalystOwner,
        mintOptions.data
      );

      const receipt = await assetMinterAsCatalystOwner.mintWithCatalyst(
        catalystOwner,
        packId.add(1),
        mintOptions.metaDataHash,
        catalystNFT,
        mintOptions.gemIds,
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

    // todo the same with 1155
    it('CatalystApplied event is emitted on minting an NFT with a catalyst', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        rareCatalyst,
        powerGem,
        defenseGem,
        assetAttributesRegistry,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: rareCatalyst, amount: 7, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 7, recipient: catalystOwner},
        {contract: defenseGem, amount: 7, recipient: catalystOwner},
      ]);

      const metaDataHash = ethers.utils.keccak256('0x11111111');
      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithCatalyst(
        catalystOwner,
        packId,
        metaDataHash,
        catalystNFT,
        mintOptions.gemIds,
        catalystOwner,
        mintOptions.data
      );

      const receipt = await assetMinterAsCatalystOwner.mintWithCatalyst(
        catalystOwner,
        packId,
        metaDataHash,
        catalystNFT,
        mintOptions.gemIds,
        catalystOwner,
        mintOptions.data
      );

      const catalystEvent = await expectEventWithArgs(
        assetAttributesRegistry,
        receipt,
        'CatalystApplied'
      );
      const args = catalystEvent.args;

      expect(args[0]).to.be.equal(assetId);
      expect(args[1]).to.be.equal(catalystNFT);
      expect(args[2]).to.deep.equal(mintOptions.gemIds);
      expect(args[3]).to.be.equal(receipt.blockNumber + 1);
    });

    it('Catalysts and gems totalSuplies are reduced when added', async function () {
      const {
        assetMinterContract,
        legendaryCatalyst,
        defenseGem,
        speedGem,
        magicGem,
        powerGem,
        catalystOwner,
        commonCatalyst,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: legendaryCatalyst, amount: 1, recipient: catalystOwner},
        {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
      ]);

      await mintGems([
        {contract: powerGem, amount: 2, recipient: catalystOwner},
        {contract: defenseGem, amount: 2, recipient: catalystOwner},
        {contract: speedGem, amount: 2, recipient: catalystOwner},
        {contract: magicGem, amount: 2, recipient: catalystOwner},
      ]);

      const commonBalanceBefore = await commonCatalyst.balanceOf(catalystOwner);
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

      await assetMinterAsCatalystOwner.mintWithCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalystNFT,
        [gems[2].gemId, gems[3].gemId, gems[0].gemId, gems[1].gemId],
        catalystOwner,
        mintOptions.data
      );

      const commonBalanceAfter = await legendaryCatalyst.balanceOf(
        catalystOwner
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

      // Even if we mint 1000 tokens it only cost one common catalyst
      await assetMinterAsCatalystOwner.mintWithCatalyst(
        catalystOwner,
        mintOptions.packId.add(1),
        mintOptions.metaDataHash,
        catalysts[0].catalystId,
        [gems[2].gemId],
        catalystOwner,
        mintOptions.data
      );
      expect(commonBalanceAfter).to.be.equal(commonBalanceBefore.sub(oneToken));
    });

    it('Mint without catalyst', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        assetContract,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      // ART
      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithoutCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalystOwner,
        artEnum,
        mintOptions.data
      );

      await assetMinterAsCatalystOwner.mintWithoutCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalystOwner,
        artEnum,
        mintOptions.data
      );

      const balanceArt = await assetContract['balanceOf(address,uint256)'](
        catalystOwner,
        assetId
      );
      expect(balanceArt).to.equal(await assetMinterContract.artQuantity());

      // Prop
      const assetIdProp = await assetMinterAsCatalystOwner.callStatic.mintWithoutCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalystOwner,
        propEnum,
        mintOptions.data
      );

      await assetMinterAsCatalystOwner.mintWithoutCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalystOwner,
        propEnum,
        mintOptions.data
      );

      const balanceProp = await assetContract['balanceOf(address,uint256)'](
        catalystOwner,
        assetIdProp
      );
      expect(balanceProp).to.equal(await assetMinterContract.propQuantity());
    });

    it('Mint custom number', async function () {
      const nbToMint = 1000;
      const {
        assetMinterContract,
        assetContract,
        legendaryCatalyst,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const {assetMinterAdmin} = await getNamedAccounts();
      const assetMinterAsAdmin = assetMinterContract.connect(
        ethers.provider.getSigner(assetMinterAdmin)
      );
      await mintCats([
        {contract: legendaryCatalyst, amount: 7, recipient: assetMinterAdmin},
      ]);

      const assetId = await assetMinterAsAdmin.callStatic.mintCustomNumberWithCatalyst(
        assetMinterAdmin,
        packId,
        mintOptions.metaDataHash,
        catalystNFT,
        [],
        bn(nbToMint),
        assetMinterAdmin,
        mintOptions.data
      );

      await assetMinterAsAdmin.mintCustomNumberWithCatalyst(
        assetMinterAdmin,
        packId,
        mintOptions.metaDataHash,
        catalystNFT,
        [],
        bn(nbToMint),
        assetMinterAdmin,
        mintOptions.data
      );

      const customMintBalance = await assetContract[
        'balanceOf(address,uint256)'
      ](assetMinterAdmin, assetId);
      expect(customMintBalance).to.equal(nbToMint);
    });
  });

  describe('AssetMinter: MintMultiple', function () {
    it('TransferBatch event is emitted on minting a single FT via mintMultiple', async function () {
      const {
        catalystOwner,
        powerGem,
        commonCatalyst,
        assetMinterContract,
        assetContract,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 7, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 7, recipient: catalystOwner},
      ]);

      const commonBalanceBefore = await commonCatalyst.balanceOf(catalystOwner);
      const powerBalanceBefore = await powerGem.balanceOf(catalystOwner);

      const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [1],
            catalystId: 1,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const receipt = await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [1],
            catalystId: 1,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const mintEvent = await expectEventWithArgs(
        assetContract,
        receipt,
        'TransferBatch'
      );
      const args = mintEvent.args;

      expect(args[0]).to.equal(assetMinterContract.address);
      expect(args[1]).to.equal(ethers.constants.AddressZero);
      expect(args[2]).to.equal(catalystOwner);
      expect(args[3]).to.deep.equal(assetIds);
      expect(args[4]).to.deep.equal([
        await assetMinterContract.commonQuantity(),
      ]);

      const commonBalanceAfter = await commonCatalyst.balanceOf(catalystOwner);
      const powerBalanceAfter = await powerGem.balanceOf(catalystOwner);

      expect(commonBalanceAfter).to.be.equal(
        commonBalanceBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
      expect(powerBalanceAfter).to.be.equal(
        powerBalanceBefore.sub(await assetMinterContract.gemUnitWhenBurning())
      );
    });

    it('TransferBatch event is emitted on minting a multiple FTs', async function () {
      const {
        catalystOwner,
        powerGem,
        defenseGem,
        speedGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        assetMinterContract,
        assetContract,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
        {contract: rareCatalyst, amount: 1, recipient: catalystOwner},
        {contract: epicCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 3, recipient: catalystOwner},
        {contract: defenseGem, amount: 2, recipient: catalystOwner},
        {contract: speedGem, amount: 1, recipient: catalystOwner},
      ]);

      const commonBalanceBefore = await commonCatalyst.balanceOf(catalystOwner);
      const rareBalanceBefore = await rareCatalyst.balanceOf(catalystOwner);
      const epicBalanceBefore = await epicCatalyst.balanceOf(catalystOwner);

      const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [1],
            catalystId: 1,
          },
          {
            gemIds: [2, 1],
            catalystId: 2,
          },
          {
            gemIds: [1, 3, 2],
            catalystId: 3,
          },
          {
            gemIds: [],
            catalystId: 4,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const receipt = await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [1],
            catalystId: 1,
          },
          {
            gemIds: [2, 1],
            catalystId: 2,
          },
          {
            gemIds: [1, 3, 2],
            catalystId: 3,
          },
          {
            gemIds: [],
            catalystId: 4,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const mintEvent = await expectEventWithArgs(
        assetContract,
        receipt,
        'TransferBatch'
      );
      const args = mintEvent.args;

      expect(args[0]).to.equal(assetMinterContract.address);
      expect(args[1]).to.equal(ethers.constants.AddressZero);
      expect(args[2]).to.equal(catalystOwner);
      expect(args[3]).to.deep.equal(assetIds);
      expect(args[4]).to.deep.equal([
        await assetMinterContract.commonQuantity(),
        await assetMinterContract.rareQuantity(),
        await assetMinterContract.epicQuantity(),
        await assetMinterContract.legendaryQuantity(),
      ]);

      const commonBalanceAfter = await commonCatalyst.balanceOf(catalystOwner);
      const rareBalanceAfter = await rareCatalyst.balanceOf(catalystOwner);
      const epicBalanceAfter = await epicCatalyst.balanceOf(catalystOwner);

      expect(commonBalanceAfter).to.be.equal(
        commonBalanceBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
      expect(rareBalanceAfter).to.be.equal(
        rareBalanceBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
      expect(epicBalanceAfter).to.be.equal(
        epicBalanceBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
    });

    it('CatalystApplied event is emitted for each NFT minted with a catalyst', async function () {
      const {
        catalystOwner,
        powerGem,
        defenseGem,
        speedGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        assetMinterContract,
        assetAttributesRegistry,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
        {contract: rareCatalyst, amount: 1, recipient: catalystOwner},
        {contract: epicCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 3, recipient: catalystOwner},
        {contract: defenseGem, amount: 2, recipient: catalystOwner},
        {contract: speedGem, amount: 1, recipient: catalystOwner},
      ]);

      const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [1],
            catalystId: 1,
          },
          {
            gemIds: [2, 1],
            catalystId: 2,
          },
          {
            gemIds: [1, 3, 2],
            catalystId: 3,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const receipt = await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [1],
            catalystId: 1,
          },
          {
            gemIds: [2, 1],
            catalystId: 2,
          },
          {
            gemIds: [1, 3, 2],
            catalystId: 3,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const testGemIds = [[1], [2, 1], [1, 3, 2]];

      const catalystAppliedEvents = await findEvents(
        assetAttributesRegistry,
        'CatalystApplied',
        receipt.blockHash
      );
      expect(catalystAppliedEvents).to.have.lengthOf(3);

      for (const [i, event] of catalystAppliedEvents.entries()) {
        if (event.args) {
          expect(event.args[0]).to.equal(assetIds[i]);
          expect(event.args[1]).to.be.equal(catalysts[i].catalystId);
          expect(event.args[2]).to.deep.equal(testGemIds[i]);
          expect(event.args[3]).to.be.equal(receipt.blockNumber + 1);
        }
      }
    });

    it('records should be updated correctly for each asset minted', async function () {
      const {
        catalystOwner,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        assetMinterContract,
        assetAttributesRegistry,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
        {contract: rareCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: speedGem, amount: 1, recipient: catalystOwner},
        {contract: magicGem, amount: 1, recipient: catalystOwner},
        {contract: luckGem, amount: 1, recipient: catalystOwner},
      ]);

      const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [5],
            catalystId: 1,
          },
          {
            gemIds: [3, 4],
            catalystId: 2,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const record1Before = await assetAttributesRegistry.getRecord(
        assetIds[0]
      );
      const record2Before = await assetAttributesRegistry.getRecord(
        assetIds[1]
      );
      expect(record1Before.exists).to.equal(false);
      expect(record2Before.exists).to.equal(false);

      await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [5],
            catalystId: 1,
          },
          {
            gemIds: [3, 4],
            catalystId: 2,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const record1After = await assetAttributesRegistry.getRecord(assetIds[0]);
      const record2After = await assetAttributesRegistry.getRecord(assetIds[1]);
      expect(record1After.exists).to.equal(true);
      expect(record1After.catalystId).to.equal(1);
      expect(record1After.gemIds[0]).to.equal(5);
      expect(record2After.exists).to.equal(true);
      expect(record2After.catalystId).to.equal(2);
      expect(record2After.gemIds[0]).to.deep.equal(3);
      expect(record2After.gemIds[1]).to.deep.equal(4);
    });

    it('totalSupply & balance should be reduced for burnt gems & catalysts', async function () {
      const {
        catalystOwner,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        assetMinterContract,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
        {contract: rareCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: speedGem, amount: 1, recipient: catalystOwner},
        {contract: magicGem, amount: 1, recipient: catalystOwner},
        {contract: luckGem, amount: 1, recipient: catalystOwner},
      ]);

      const commonBalanceBefore = await commonCatalyst.balanceOf(catalystOwner);
      const rareBalanceBefore = await rareCatalyst.balanceOf(catalystOwner);
      const speedBalanceBefore = await speedGem.balanceOf(catalystOwner);
      const magicBalanceBefore = await magicGem.balanceOf(catalystOwner);
      const luckBalanceBefore = await luckGem.balanceOf(catalystOwner);
      const commonSupplyBefore = await commonCatalyst.totalSupply();
      const rareSupplyBefore = await rareCatalyst.totalSupply();
      const speedSupplyBefore = await speedGem.totalSupply();
      const magicSupplyBefore = await magicGem.totalSupply();
      const luckSupplyBefore = await luckGem.totalSupply();

      await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
        {
          from: catalystOwner,
          packId: mintMultiOptions.packId,
          metadataHash: mintMultiOptions.metadataHash,
        },
        [
          {
            gemIds: [5],
            catalystId: 1,
          },
          {
            gemIds: [3, 4],
            catalystId: 2,
          },
        ],
        catalystOwner,
        mintMultiOptions.data
      );

      const commonBalanceAfter = await commonCatalyst.balanceOf(catalystOwner);
      const rareBalanceAfter = await rareCatalyst.balanceOf(catalystOwner);
      const speedBalanceAfter = await speedGem.balanceOf(catalystOwner);
      const magicBalanceAfter = await magicGem.balanceOf(catalystOwner);
      const luckBalanceAfter = await luckGem.balanceOf(catalystOwner);
      const commonSupplyAfter = await commonCatalyst.totalSupply();
      const rareSupplyAfter = await rareCatalyst.totalSupply();
      const speedSupplyAfter = await speedGem.totalSupply();
      const magicSupplyAfter = await magicGem.totalSupply();
      const luckSupplyAfter = await luckGem.totalSupply();

      expect(commonBalanceAfter).to.be.equal(
        commonBalanceBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
      expect(rareBalanceAfter).to.be.equal(
        rareBalanceBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
      expect(speedBalanceAfter).to.be.equal(
        speedBalanceBefore.sub(await assetMinterContract.gemUnitWhenBurning())
      );
      expect(magicBalanceAfter).to.be.equal(
        magicBalanceBefore.sub(await assetMinterContract.gemUnitWhenBurning())
      );
      expect(luckBalanceAfter).to.be.equal(
        luckBalanceBefore.sub(await assetMinterContract.gemUnitWhenBurning())
      );
      expect(commonSupplyAfter).to.be.equal(
        commonSupplyBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
      expect(rareSupplyAfter).to.be.equal(
        rareSupplyBefore.sub(
          await assetMinterContract.catalystUnitWhenBurning()
        )
      );
      expect(speedSupplyAfter).to.be.equal(
        speedSupplyBefore.sub(await assetMinterContract.gemUnitWhenBurning())
      );
      expect(magicSupplyAfter).to.be.equal(
        magicSupplyBefore.sub(await assetMinterContract.gemUnitWhenBurning())
      );
      expect(luckSupplyAfter).to.be.equal(
        luckSupplyBefore.sub(await assetMinterContract.gemUnitWhenBurning())
      );
    });
  });

  describe('AssetMinter: addGems', function () {
    it('Can extract an erc721 & add Gems', async function () {
      const {
        assetMinterContract,
        assetUpgraderContract,
        assetAttributesRegistry,
        assetAttributesRegistryAdmin,
        sandContract,
        legendaryCatalyst,
        defenseGem,
        speedGem,
        magicGem,
        powerGem,
        catalystOwner,
      } = await setupAssetMinterUpgraderGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: legendaryCatalyst, amount: 7, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 7, recipient: catalystOwner},
        {contract: defenseGem, amount: 7, recipient: catalystOwner},
        {contract: speedGem, amount: 7, recipient: catalystOwner},
        {contract: magicGem, amount: 7, recipient: catalystOwner},
      ]);

      const assetUpgraderAsAssetOwner = assetUpgraderContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await waitFor(
        assetAttributesRegistry
          .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
          .changeMinter(assetMinterContract.address)
      );
      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [],
        catalystOwner,
        mintOptions.data
      );

      await assetMinterAsCatalystOwner.mintWithCatalyst(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [],
        catalystOwner,
        mintOptions.data
      );

      const gemIds = [
        gems[0].gemId,
        gems[1].gemId,
        gems[2].gemId,
        gems[3].gemId,
      ];

      await waitFor(
        assetUpgraderAsAssetOwner.addGems(
          catalystOwner,
          assetId,
          gemIds,
          catalystOwner
        )
      );

      const record = await assetAttributesRegistry.getRecord(assetId);
      expect(record.exists).to.equal(true);
      expect(record.catalystId).to.equal(catalysts[3].catalystId);
      expect(record.gemIds).to.deep.equal([
        ...gemIds,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]);
    });
  });

  describe('AssetMinter: Failures', function () {
    it('should fail if "to" == address(0)', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintWithCatalyst(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          mintOptions.gemIds,
          mintOptions.to,
          mintOptions.data
        )
      ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
    });

    it('custom minting: should fail if not admin', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintCustomNumberWithCatalyst(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          mintOptions.gemIds,
          bn(0),
          mintOptions.to,
          mintOptions.data
        )
      ).to.be.revertedWith('ADMIN_ONLY');
    });

    it('custom minting: should fail if qty = 0', async function () {
      const {assetMinterContract} = await setupAssetMinterGemsAndCatalysts();
      const {assetMinterAdmin} = await getNamedAccounts();
      const assetMinterAsAdmin = assetMinterContract.connect(
        ethers.provider.getSigner(assetMinterAdmin)
      );
      await expect(
        assetMinterAsAdmin.mintCustomNumberWithCatalyst(
          assetMinterAdmin,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          mintOptions.gemIds,
          bn(0),
          assetMinterAdmin,
          mintOptions.data
        )
      ).to.be.revertedWith('AssetMinter: quantity cannot be 0');
    });

    it('should fail if "from" != _msgSender()', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const users = await getUnnamedAccounts();
      const assetMinterAsMetaTxProcessor = assetMinterContract.connect(
        ethers.provider.getSigner(users[9])
      );
      await expect(
        assetMinterAsMetaTxProcessor.mintWithCatalyst(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          mintOptions.gemIds,
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('AUTH_ACCESS_DENIED');
    });

    it('should fail if gem == Gem(0)', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintWithCatalyst(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          [0, gems[1].gemId],
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
        assetMinterContract,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: rareCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: luckGem, amount: 17, recipient: catalystOwner},
      ]);

      await expect(
        assetMinterAsCatalystOwner.mintWithCatalyst(
          catalystOwner,
          mintOptions.packId,
          mintOptions.metaDataHash,
          mintOptions.catalystId,
          new Array(17).fill(5),
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('GEMS_MAX_REACHED');
    });

    it('should fail if gemIds.length > maxGems', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        commonCatalyst,
        powerGem,
        defenseGem,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 2, recipient: catalystOwner},
        {contract: defenseGem, amount: 1, recipient: catalystOwner},
      ]);

      await expect(
        assetMinterAsCatalystOwner.mintWithCatalyst(
          catalystOwner,
          packId,
          mintOptions.metaDataHash,
          [catalysts[0].catalystId],
          [gems[0].gemId, gems[0].gemId, gems[1].gemId],
          catalystOwner,
          mintOptions.data
        )
      ).to.be.revertedWith('GEMS_TOO_MANY');
    });

    it('mintMultiple should fail if assets.length == 0', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
          },
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
        assetMinterContract,
        user3,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsUser3 = assetMinterContract.connect(
        ethers.provider.getSigner(user3)
      );

      await mintGems([
        {contract: powerGem, amount: 1, recipient: catalystOwner},
        {contract: speedGem, amount: 1, recipient: catalystOwner},
      ]);

      await expect(
        assetMinterAsUser3.mintMultipleWithCatalyst(
          {
            from: user3,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
          },
          [
            {
              gemIds: [1],
              catalystId: 1,
            },
            {
              gemIds: [3],
              catalystId: 2,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INSUFFICIENT_FUNDS');
    });

    it('mintMultiple should fail if gemsQuantities == 0', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
          },
          [],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('INVALID_0_ASSETS');
    });

    it('mintMultiple should fail if trying to add too many gems', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = await assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
          },
          [
            {
              gemIds: [1, 1, 1],
              catalystId: 1,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('AssetMinter: too many gems');
    });

    it('should fail if gemsId = 6', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );
      await expect(
        assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
          },
          [
            {
              gemIds: [6],
              catalystId: 1,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('AssetMinter: gemId out of bound');
    });
    it('should fail if catalystsId = 5', async function () {
      const {
        assetMinterContract,
        catalystOwner,
      } = await setupAssetMinterGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await expect(
        assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
          },
          [
            {
              gemIds: [5],
              catalystId: 5,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('AssetMinter: catalystID out of bound');
    });

    it('mintMultiple should not set catalyst if catalystId == 0', async function () {
      const {
        assetMinterContract,
        commonCatalyst,
        powerGem,
        catalystOwner,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      await mintCats([
        {contract: commonCatalyst, amount: 2, recipient: catalystOwner},
      ]);
      await mintGems([
        {contract: powerGem, amount: 2, recipient: catalystOwner},
      ]);

      await expect(
        assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
          },
          [
            {
              gemIds: [1],
              catalystId: 0,
            },
          ],
          catalystOwner,
          mintMultiOptions.data
        )
      ).to.be.revertedWith('AssetMinter: catalystID out of bound');
    });
  });
});
