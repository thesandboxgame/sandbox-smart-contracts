import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {BigNumber, Contract} from 'ethers';
import {expect} from '../../../chai-setup';
import catalysts from '../../../../data/catalysts';
import gems from '../../../../data/gems';
import assetWOCatalyst from '../../../../data/assetTypesWOCatalyst';
import {
  setupAssetMinter,
  setupAssetMinterAttributesRegistryGemsAndCatalysts,
  setupAssetMinterGemsAndCatalysts,
  setupAssetMinterUpgraderGemsAndCatalysts,
} from './fixtures';
import {mintCatalyst, mintGem} from '../utils';
import {expectEventWithArgs, findEvents, waitFor} from '../../../utils';
import {depositViaChildChainManager} from '../../../polygon/sand/fixtures';
import {zeroAddress} from '../../../land/fixtures';

const packId = BigNumber.from('1');
const hash = ethers.utils.keccak256('0x42');
const catId = catalysts[1].catalystId;
const catalystNFT = catalysts[3].catalystId;
const ids = [gems[0].gemId, gems[1].gemId];
const supply = 1;
const callData = Buffer.from('');
const testQuantity = BigNumber.from('0x42');

function getCatalystIdByName(name: string) {
  return catalysts.find((cata) => cata.symbol === name)?.catalystId;
}
const legendaryCataId = getCatalystIdByName('LEGENDARY');
const commonCataId = getCatalystIdByName('COMMON');
const powerGemId = gems.find((gem) => gem.symbol === 'POWER')?.gemId;
const artId = assetWOCatalyst.find((asset) => asset.symbol === 'ART')?.Id;
const propId = assetWOCatalyst.find((asset) => asset.symbol === 'PROP')?.Id;

const gemsCatalystsUnit = '1000000000000000000';

const oneToken = BigNumber.from(1).mul(gemsCatalystsUnit);
const mintOptions = {
  from: ethers.constants.AddressZero,
  packId: packId,
  metaDataHash: hash,
  catalystId: catId,
  gemIds: ids,
  quantity: supply,
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

function getBigInt(num: number) {
  let output = '1';
  for (let i = 0; i < num; i++) {
    output += '0';
  }
  return output;
}

describe('AssetMinter', function () {
  describe('AssetMinter: Mint', function () {
    it('the assetMinterAdmin is set correctly', async function () {
      const {assetMinterContract} = await setupAssetMinter();
      const {assetMinterAdmin} = await getNamedAccounts();
      const minterAdmin = await assetMinterContract.owner();
      expect(minterAdmin).to.equal(assetMinterAdmin);
    });

    it('the assetMinter quantities are set correctly', async function () {
      const {
        assetMinterContractAsOwner,
        assetMinterContract,
      } = await setupAssetMinter();

      for (const cat of catalysts) {
        await assetMinterContractAsOwner.addOrReplaceQuantityByCatalystId(
          cat.catalystId,
          cat.catalystId
        );
      }

      for (const asset of assetWOCatalyst) {
        await assetMinterContractAsOwner.addOrReplaceAssetTypeQuantity(
          asset.Id,
          asset.Id * 10
        );
      }

      await assetMinterContractAsOwner.setNumberOfGemsBurnPerAsset(
        testQuantity
      );
      await assetMinterContractAsOwner.setNumberOfCatalystsBurnPerAsset(
        testQuantity
      );

      for (const cat of catalysts) {
        expect(
          await assetMinterContract.quantitiesByCatalystId(cat.catalystId)
        ).to.equal(cat.catalystId);
      }

      for (const asset of assetWOCatalyst) {
        expect(
          await assetMinterContractAsOwner.quantitiesByAssetTypeId(asset.Id)
        ).to.equal(asset.Id * 10);
      }

      expect(await assetMinterContract.numberOfGemsBurnPerAsset()).to.equal(
        testQuantity
      );
      expect(await assetMinterContract.numberOfCatalystBurnPerAsset()).to.equal(
        testQuantity
      );
    });
    it('mintWithCatalyst transaction reverts in case of change in quantitiesByCatalyst', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        assetMinterContractAsOwner,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: mintOptions.packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        legendaryCataId
      );
      await assetMinterContractAsOwner.addOrReplaceQuantityByCatalystId(
        legendaryCataId,
        quantitiesByCatalystId + 1
      );

      await expect(
        assetMinterAsCatalystOwner.mintWithCatalyst(
          mintData,
          legendaryCataId,
          [powerGemId],
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        )
      ).to.revertedWith('AssetMinter : Invalid quantitiesByCatalyst value');
    });
    it('mintWithCatalyst transaction reverts in case of change in numberOfGemsBurnPerAsset', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        assetMinterContractAsOwner,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: mintOptions.packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        legendaryCataId
      );
      await assetMinterContractAsOwner.setNumberOfGemsBurnPerAsset(
        numberOfGemsBurnPerAsset + 1
      );

      await expect(
        assetMinterAsCatalystOwner.mintWithCatalyst(
          mintData,
          legendaryCataId,
          [powerGemId],
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        )
      ).to.revertedWith('AssetMinter: invalid numberOfGemsBurnPerAsset value');
    });
    it('mintWithCatalyst transaction reverts in case of change in numberOfCatalystBurnPerAsset', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        assetMinterContractAsOwner,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: mintOptions.packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        legendaryCataId
      );
      await assetMinterContractAsOwner.setNumberOfCatalystsBurnPerAsset(
        numberOfCatalystBurnPerAsset + 1
      );

      await expect(
        assetMinterAsCatalystOwner.mintWithCatalyst(
          mintData,
          legendaryCataId,
          [powerGemId],
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        )
      ).to.revertedWith(
        'AssetMinter: invalid numberOfCatalystBurnPerAsset value'
      );
    });
    it('Record is created with correct data on minting with legendary catalyst (NFT)', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        assetAttributesRegistry,
        assetContract,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: mintOptions.packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        legendaryCataId
      );

      const recipt = await assetMinterAsCatalystOwner.mintWithCatalyst(
        mintData,
        legendaryCataId,
        [powerGemId],
        quantitiesByCatalystId,
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
      );
      const event = await expectEventWithArgs(
        assetContract,
        recipt,
        'TransferSingle'
      );
      const assetId = event.args[3];

      const balance = await assetContract['balanceOf(address,uint256)'](
        catalystOwner,
        assetId
      );
      const quantity = await assetMinterContract.quantitiesByCatalystId(
        legendaryCataId
      );
      expect(balance).to.equal(quantity);

      const record = await assetAttributesRegistry.getRecord(assetId);
      expect(record.catalystId).to.equal(legendaryCataId);
      expect(record.exists).to.equal(true);
      expect(record.gemIds.length).to.equal(15);
      expect(record.gemIds[0]).to.equal(quantity);
    });

    it('Transfer event is emitted on minting an NFT (catalyst legendary) - TODO: fix', async function () {
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

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: packId.add(1),
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        catalystNFT
      );
      // only legendary catalyst can mint NFT (catalysts[3].catalystId)
      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithCatalyst(
        mintData,
        catalystNFT,
        mintOptions.gemIds,
        quantitiesByCatalystId,
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
      );

      const tx = await assetMinterAsCatalystOwner.mintWithCatalyst(
        mintData,
        catalystNFT,
        mintOptions.gemIds,
        quantitiesByCatalystId,
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
      );

      const receipt = await tx.wait();
      const mintEvent = await expectEventWithArgs(
        assetContract,
        receipt,
        'TransferSingle'
      );
      const args = mintEvent.args;

      expect(args[2]).to.be.equal(catalystOwner);
      expect(args[1]).to.be.equal(ethers.constants.AddressZero);
      expect(args[3]).to.be.equal(assetId);
    });

    // TODO: the same with 1155
    it('CatalystApplied event is emitted on minting an NFT with a catalyst', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        rareCatalyst,
        powerGem,
        defenseGem,
        assetAttributesRegistry,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
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

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: packId,
        metadataHash: metaDataHash,
        data: mintOptions.data,
      };

      const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        catalystNFT
      );

      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithCatalyst(
        mintData,
        catalystNFT,
        mintOptions.gemIds,
        quantitiesByCatalystId,
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
      );

      const receipt = await assetMinterAsCatalystOwner.mintWithCatalyst(
        mintData,
        catalystNFT,
        mintOptions.gemIds,
        quantitiesByCatalystId,
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
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
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
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

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        catalystNFT
      );

      await assetMinterAsCatalystOwner.mintWithCatalyst(
        mintData,
        catalystNFT,
        [gems[2].gemId, gems[3].gemId, gems[0].gemId, gems[1].gemId],
        quantitiesByCatalystId,
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
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

      mintData.packId.add(1);
      const numberOfGemsBurnPerAssetNew = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAssetNew = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
      const quantitiesByCatalystIdNew = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
        catalysts[0].catalystId
      );

      // Even if we mint 1000 tokens it only cost one common catalyst
      await assetMinterAsCatalystOwner.mintWithCatalyst(
        mintData,
        catalysts[0].catalystId,
        [gems[2].gemId],
        quantitiesByCatalystIdNew,
        numberOfCatalystBurnPerAssetNew,
        numberOfGemsBurnPerAssetNew
      );
      expect(commonBalanceAfter).to.be.equal(commonBalanceBefore.sub(oneToken));
    });
    it('Mint without catalyst reverts in case of change in quantitiesByAssetType', async function () {
      const {
        assetMinterContract,
        catalystOwner,
        assetMinterContractAsOwner,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();
      const assetMinterAsCatalystOwner = assetMinterContract.connect(
        ethers.provider.getSigner(catalystOwner)
      );

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: mintOptions.packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const quantitiesByAssetTypeId = await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(
        artId
      );
      await assetMinterContractAsOwner.addOrReplaceAssetTypeQuantity(
        artId,
        quantitiesByAssetTypeId + 1
      );
      // ART
      await expect(
        assetMinterAsCatalystOwner.callStatic.mintWithoutCatalyst(
          mintData,
          artId,
          quantitiesByAssetTypeId
        )
      ).to.revertedWith('AssetMinter: Invalid quantitiesByAssetType value');
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

      const mintData = {
        from: catalystOwner,
        to: catalystOwner,
        packId: mintOptions.packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const quantitiesByAssetTypeId = await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(
        artId
      );
      // ART
      const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithoutCatalyst(
        mintData,
        artId,
        quantitiesByAssetTypeId
      );

      await assetMinterAsCatalystOwner.mintWithoutCatalyst(
        mintData,
        artId,
        quantitiesByAssetTypeId
      );

      const balanceArt = await assetContract['balanceOf(address,uint256)'](
        catalystOwner,
        assetId
      );
      expect(balanceArt).to.equal(
        await assetMinterContract.quantitiesByAssetTypeId(artId)
      );
      const quantitiesByAssetTypeIdNew = await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(
        propId
      );
      // Prop
      const assetIdProp = await assetMinterAsCatalystOwner.callStatic.mintWithoutCatalyst(
        mintData,
        propId,
        quantitiesByAssetTypeIdNew
      );

      await assetMinterAsCatalystOwner.mintWithoutCatalyst(
        mintData,
        propId,
        quantitiesByAssetTypeIdNew
      );

      const balanceProp = await assetContract['balanceOf(address,uint256)'](
        catalystOwner,
        assetIdProp
      );
      expect(balanceProp).to.equal(
        await assetMinterContract.quantitiesByAssetTypeId(propId)
      );
    });

    it('Mint custom number admin', async function () {
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

      const mintData = {
        from: assetMinterAdmin,
        to: assetMinterAdmin,
        packId: packId,
        metadataHash: mintOptions.metaDataHash,
        data: mintOptions.data,
      };
      const numberOfGemsBurnPerAsset = await assetMinterAsAdmin.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterAsAdmin.numberOfCatalystBurnPerAsset();
      const assetId = await assetMinterAsAdmin.callStatic.mintCustomNumberWithCatalyst(
        mintData,
        catalystNFT,
        [],
        bn(nbToMint),
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
      );

      await assetMinterAsAdmin.mintCustomNumberWithCatalyst(
        mintData,
        catalystNFT,
        [],
        bn(nbToMint),
        numberOfCatalystBurnPerAsset,
        numberOfGemsBurnPerAsset
      );

      const customMintBalance = await assetContract[
        'balanceOf(address,uint256)'
      ](assetMinterAdmin, assetId);
      expect(customMintBalance).to.equal(nbToMint);
    });

    it('Mint custom number user3', async function () {
      const nbToMint = 1000;
      const {
        assetMinterContract,
        legendaryCatalyst,
        assetContract,
        user3,
        assetMinterContractAsUser3,
      } = await setupAssetMinterAttributesRegistryGemsAndCatalysts();

      const {assetMinterAdmin} = await getNamedAccounts();
      const assetMinterAsAdmin = assetMinterContract.connect(
        ethers.provider.getSigner(assetMinterAdmin)
      );

      await mintCats([
        {contract: legendaryCatalyst, amount: 7, recipient: user3},
      ]);
      const numberOfGemsBurnPerAsset = await assetMinterContractAsUser3.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAsset = await assetMinterContractAsUser3.numberOfCatalystBurnPerAsset();
      await expect(
        assetMinterContractAsUser3.mintCustomNumberWithCatalyst(
          {
            from: user3,
            to: assetMinterAdmin,
            packId: 42,
            metadataHash: mintOptions.metaDataHash,
            data: mintOptions.data,
          },
          catalystNFT,
          [],
          bn(nbToMint),
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        )
      ).to.be.revertedWith('AssetMinter: custom minting unauthorized');

      await assetMinterAsAdmin.setCustomMintingAllowance(user3, true);

      const setCustomMintingAllowanceEvent = await assetMinterAsAdmin.queryFilter(
        assetMinterAsAdmin.filters.CustomMintingAllowanceChanged()
      );
      const event = setCustomMintingAllowanceEvent.filter(
        (e) => e.event === 'CustomMintingAllowanceChanged'
      )[0];
      expect(event.args).not.to.equal(null || undefined);
      if (event.args) {
        expect(event.args[0]).to.equal(user3);
        expect(event.args[1]).to.equal(true);
      }
      const numberOfGemsBurnPerAssetNew = await assetMinterContractAsUser3.numberOfGemsBurnPerAsset();
      const numberOfCatalystBurnPerAssetNew = await assetMinterContractAsUser3.numberOfCatalystBurnPerAsset();
      const assetId = await assetMinterContractAsUser3.callStatic.mintCustomNumberWithCatalyst(
        {
          from: user3,
          to: user3,
          packId: 42,
          metadataHash: mintOptions.metaDataHash,
          data: mintOptions.data,
        },
        catalystNFT,
        [],
        bn(nbToMint),
        numberOfCatalystBurnPerAssetNew,
        numberOfGemsBurnPerAssetNew
      );

      await assetMinterContractAsUser3.mintCustomNumberWithCatalyst(
        {
          from: user3,
          to: user3,
          packId: 42,
          metadataHash: mintOptions.metaDataHash,
          data: mintOptions.data,
        },
        catalystNFT,
        [],
        bn(nbToMint),
        numberOfCatalystBurnPerAssetNew,
        numberOfGemsBurnPerAssetNew
      );

      const customMintBalance = await assetContract[
        'balanceOf(address,uint256)'
      ](user3, assetId);
      expect(customMintBalance).to.equal(nbToMint);
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
        const assetMinterAsCatalystOwner = assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );

        await mintCats([
          {contract: commonCatalyst, amount: 7, recipient: catalystOwner},
        ]);
        await mintGems([
          {contract: powerGem, amount: 7, recipient: catalystOwner},
        ]);

        const commonBalanceBefore = await commonCatalyst.balanceOf(
          catalystOwner
        );
        const powerBalanceBefore = await powerGem.balanceOf(catalystOwner);
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          commonCataId
        );

        const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          [
            {
              gemIds: [powerGemId],
              catalystId: commonCataId,
            },
          ],
          [quantitiesByCatalystId],
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        );

        const receipt = await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          [
            {
              gemIds: [powerGemId],
              catalystId: commonCataId,
            },
          ],
          [quantitiesByCatalystId],
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
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
          await assetMinterContract.quantitiesByCatalystId(commonCataId),
        ]);

        const commonBalanceAfter = await commonCatalyst.balanceOf(
          catalystOwner
        );

        const powerBalanceAfter = await powerGem.balanceOf(catalystOwner);

        const commonDec = await commonCatalyst.getDecimals();
        // TODO: fix
        // expect(10 ** commonDec).to.be.equal(BigNumber.from(gemsCatalystsUnit));

        expect(commonBalanceAfter).to.be.equal(
          commonBalanceBefore.sub(ethers.BigNumber.from(getBigInt(commonDec)))
        );

        const powerDec = await powerGem.getDecimals();

        expect(powerBalanceAfter).to.be.equal(
          powerBalanceBefore.sub(BigNumber.from(getBigInt(powerDec)))
        );
      });

      it('TransferBatch event is emitted on minting a single FT via mintMultipleWithoutCatalyst', async function () {
        const {
          catalystOwner,
          assetMinterContract,
          assetContract,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const [asset] = assetWOCatalyst;
        const quantitiesByAssetTypeId = await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(
          asset.Id
        );
        const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithoutCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          [quantitiesByAssetTypeId],
          [asset.Id]
        );

        const receipt = await assetMinterAsCatalystOwner.mintMultipleWithoutCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          [quantitiesByAssetTypeId],
          [asset.Id]
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
          BigNumber.from(quantitiesByAssetTypeId),
        ]);
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

        // const commonBalanceBefore = await commonCatalyst.balanceOf(
        //   catalystOwner
        // );
        // const rareBalanceBefore = await rareCatalyst.balanceOf(catalystOwner);
        // const epicBalanceBefore = await epicCatalyst.balanceOf(catalystOwner);
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [1],
            catalystId: commonCataId,
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
            catalystId: legendaryCataId,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsCatalystOwner.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }

        const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetArray,
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        );

        const receipt = await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetArray,
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
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
          await assetMinterContract.quantitiesByCatalystId(commonCataId),
          await assetMinterContract.quantitiesByCatalystId(
            catalysts[1].catalystId
          ),
          await assetMinterContract.quantitiesByCatalystId(
            catalysts[2].catalystId
          ),
          await assetMinterContract.quantitiesByCatalystId(legendaryCataId),
        ]);

        // const commonBalanceAfter = await commonCatalyst.balanceOf(
        //   catalystOwner
        // );
        // const rareBalanceAfter = await rareCatalyst.balanceOf(catalystOwner);
        // const epicBalanceAfter = await epicCatalyst.balanceOf(catalystOwner);

        // TODO: update for decimals()
        // expect(commonBalanceAfter).to.be.equal(
        //   commonBalanceBefore.sub(await assetMinterContract.catalystsFactor())
        // );
        // expect(rareBalanceAfter).to.be.equal(
        //   rareBalanceBefore.sub(await assetMinterContract.catalystsFactor())
        // );
        // expect(epicBalanceAfter).to.be.equal(
        //   epicBalanceBefore.sub(await assetMinterContract.catalystsFactor())
        // );
      });
      it('TransferBatch event is emitted on minting a multiple FTs via mintMultipleWithoutCatalyst', async function () {
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
        const assetQuantities = [];
        const assetTypeIds = [];
        for (const asset of assetWOCatalyst) {
          assetQuantities.push(
            await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(asset.Id)
          );
          assetTypeIds.push(asset.Id);
        }
        assetQuantities.reverse();
        assetTypeIds.reverse();
        const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithoutCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetQuantities,
          assetTypeIds
        );

        const receipt = await assetMinterAsCatalystOwner.mintMultipleWithoutCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetQuantities,
          assetTypeIds
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
        expect(args[4]).to.deep.equal(assetQuantities);
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [1],
            catalystId: commonCataId,
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
            catalystId: legendaryCataId,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsCatalystOwner.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }

        const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetArray,
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        );

        const receipt = await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetArray,
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        );

        const testGemIds = [[1], [2, 1], [1, 3, 2], []];

        const catalystAppliedEvents = await findEvents(
          assetAttributesRegistry,
          'CatalystApplied',
          receipt.blockHash
        );
        expect(catalystAppliedEvents).to.have.lengthOf(4);

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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [5],
            catalystId: 1,
          },
          {
            gemIds: [3, 4],
            catalystId: 2,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsCatalystOwner.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }

        const assetIds = await assetMinterAsCatalystOwner.callStatic.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetArray,
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
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
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetArray,
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        );

        const record1After = await assetAttributesRegistry.getRecord(
          assetIds[0]
        );
        const record2After = await assetAttributesRegistry.getRecord(
          assetIds[1]
        );
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [5],
            catalystId: 1,
          },
          {
            gemIds: [3, 4],
            catalystId: 2,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsCatalystOwner.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }

        // const commonBalanceBefore = await commonCatalyst.balanceOf(
        //   catalystOwner
        // );
        // const rareBalanceBefore = await rareCatalyst.balanceOf(catalystOwner);
        // const speedBalanceBefore = await speedGem.balanceOf(catalystOwner);
        // const magicBalanceBefore = await magicGem.balanceOf(catalystOwner);
        // const luckBalanceBefore = await luckGem.balanceOf(catalystOwner);
        // const commonSupplyBefore = await commonCatalyst.totalSupply();
        // const rareSupplyBefore = await rareCatalyst.totalSupply();
        // const speedSupplyBefore = await speedGem.totalSupply();
        // const magicSupplyBefore = await magicGem.totalSupply();
        // const luckSupplyBefore = await luckGem.totalSupply();

        await assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          assetArray,
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        );

        // const commonBalanceAfter = await commonCatalyst.balanceOf(
        //   catalystOwner
        // );
        // const rareBalanceAfter = await rareCatalyst.balanceOf(catalystOwner);
        // const speedBalanceAfter = await speedGem.balanceOf(catalystOwner);
        // const magicBalanceAfter = await magicGem.balanceOf(catalystOwner);
        // const luckBalanceAfter = await luckGem.balanceOf(catalystOwner);
        // const commonSupplyAfter = await commonCatalyst.totalSupply();
        // const rareSupplyAfter = await rareCatalyst.totalSupply();
        // const speedSupplyAfter = await speedGem.totalSupply();
        // const magicSupplyAfter = await magicGem.totalSupply();
        // const luckSupplyAfter = await luckGem.totalSupply();

        // TODO: update for decimals()
        // expect(commonBalanceAfter).to.be.equal(
        //   commonBalanceBefore.sub(await assetMinterContract.catalystsFactor())
        // );
        // expect(rareBalanceAfter).to.be.equal(
        //   rareBalanceBefore.sub(await assetMinterContract.catalystsFactor())
        // );
        // expect(speedBalanceAfter).to.be.equal(
        //   speedBalanceBefore.sub(await assetMinterContract.gemsFactor())
        // );
        // expect(magicBalanceAfter).to.be.equal(
        //   magicBalanceBefore.sub(await assetMinterContract.gemsFactor())
        // );
        // expect(luckBalanceAfter).to.be.equal(
        //   luckBalanceBefore.sub(await assetMinterContract.gemsFactor())
        // );
        // expect(commonSupplyAfter).to.be.equal(
        //   commonSupplyBefore.sub(await assetMinterContract.catalystsFactor())
        // );
        // expect(rareSupplyAfter).to.be.equal(
        //   rareSupplyBefore.sub(await assetMinterContract.catalystsFactor())
        // );
        // expect(speedSupplyAfter).to.be.equal(
        //   speedSupplyBefore.sub(await assetMinterContract.gemsFactor())
        // );
        // expect(magicSupplyAfter).to.be.equal(
        //   magicSupplyBefore.sub(await assetMinterContract.gemsFactor())
        // );
        // expect(luckSupplyAfter).to.be.equal(
        //   luckSupplyBefore.sub(await assetMinterContract.gemsFactor())
        // );
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
          sandAdmin,
        } = await setupAssetMinterUpgraderGemsAndCatalysts();
        const sandContractAsAdmin = await sandContract.connect(
          ethers.provider.getSigner(sandAdmin)
        );

        const SAND_AMOUNT = BigNumber.from(100000).mul(`1000000000000000000`);
        const childChainManager = await ethers.getContract(
          'CHILD_CHAIN_MANAGER'
        );
        await depositViaChildChainManager(
          {sand: sandContract, childChainManager},
          sandAdmin,
          SAND_AMOUNT
        );
        await sandContractAsAdmin.transfer(catalystOwner, SAND_AMOUNT);

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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          catalysts[3].catalystId
        );
        const assetId = await assetMinterAsCatalystOwner.callStatic.mintWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          catalysts[3].catalystId,
          [],
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
        );

        await assetMinterAsCatalystOwner.mintWithCatalyst(
          {
            from: catalystOwner,
            to: catalystOwner,
            packId: mintMultiOptions.packId,
            metadataHash: mintMultiOptions.metadataHash,
            data: mintMultiOptions.data,
          },
          catalysts[3].catalystId,
          [],
          quantitiesByCatalystId,
          numberOfCatalystBurnPerAsset,
          numberOfGemsBurnPerAsset
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          mintOptions.catalystId
        );
        await expect(
          assetMinterAsCatalystOwner.mintWithCatalyst(
            {
              from: catalystOwner,
              to: mintOptions.to,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            mintOptions.catalystId,
            mintOptions.gemIds,
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
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
        const numberOfGemsBurnPerAsset = await assetMinterAsMetaTxProcessor.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsMetaTxProcessor.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsMetaTxProcessor.quantitiesByCatalystId(
          mintOptions.catalystId
        );
        await expect(
          assetMinterAsMetaTxProcessor.mintWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            mintOptions.catalystId,
            mintOptions.gemIds,
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          mintOptions.catalystId
        );
        await expect(
          assetMinterAsCatalystOwner.mintWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            mintOptions.catalystId,
            [0, gems[1].gemId],
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          mintOptions.catalystId
        );
        await expect(
          assetMinterAsCatalystOwner.mintWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            mintOptions.catalystId,
            new Array(17).fill(5),
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
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
        const assetMinterAsCatalystOwner = assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );

        await mintCats([
          {contract: commonCatalyst, amount: 1, recipient: catalystOwner},
        ]);
        await mintGems([
          {contract: powerGem, amount: 2, recipient: catalystOwner},
          {contract: defenseGem, amount: 1, recipient: catalystOwner},
        ]);
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          catalysts[0].catalystId
        );

        await expect(
          assetMinterAsCatalystOwner.mintWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [catalysts[0].catalystId],
            [gems[0].gemId, gems[0].gemId, gems[1].gemId],
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('GEMS_TOO_MANY');
      });

      it('minting WO catalyst: should fail if asstID = 0', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const quantitiesByAssetTypeId = await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(
          0
        );
        await expect(
          assetMinterAsCatalystOwner.mintWithoutCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            0,
            quantitiesByAssetTypeId
          )
        ).to.be.revertedWith('AssetMinter: quantity cannot be 0');
      });

      it('custom minting: should fail if qty = 0', async function () {
        const {assetMinterContract} = await setupAssetMinterGemsAndCatalysts();
        const {assetMinterAdmin} = await getNamedAccounts();
        const assetMinterAsAdmin = assetMinterContract.connect(
          ethers.provider.getSigner(assetMinterAdmin)
        );
        const numberOfGemsBurnPerAsset = await assetMinterAsAdmin.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsAdmin.numberOfCatalystBurnPerAsset();
        await expect(
          assetMinterAsAdmin.mintCustomNumberWithCatalyst(
            {
              from: assetMinterAdmin,
              to: assetMinterAdmin,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            mintOptions.catalystId,
            mintOptions.gemIds,
            bn(0),
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('AssetMinter: quantity cannot be 0');
      });

      it('custom minting: should fail if not admin', async function () {
        const {
          assetMinterContractAsUser3,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const numberOfGemsBurnPerAsset = await assetMinterContractAsUser3.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterContractAsUser3.numberOfCatalystBurnPerAsset();
        await expect(
          assetMinterContractAsUser3.mintCustomNumberWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            mintOptions.catalystId,
            mintOptions.gemIds,
            bn(0),
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('AssetMinter: custom minting unauthorized');
      });

      it('mintMultiple should fail if assets.length == 0', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = await assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [],
            [],
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('INVALID_0_ASSETS');
      });

      it('mintMultipleWithoutCatalyst should fail if supplies.length == 0', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = await assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithoutCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [],
            []
          )
        ).to.be.revertedWith('INVALID_0_ASSETS');
      });

      it('mintMultipleWithoutCatalyst should fail if mintData.to is zero address', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = await assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const assetQuantities = [];
        const assetTypeIds = [];
        for (const asset of assetWOCatalyst) {
          assetQuantities.push(
            await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(asset.Id)
          );
          assetTypeIds.push(asset.Id);
        }
        assetQuantities.reverse();
        assetTypeIds.reverse();
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithoutCatalyst(
            {
              from: catalystOwner,
              to: zeroAddress,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetQuantities,
            assetTypeIds
          )
        ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
      });

      it('mintMultipleWithoutCatalyst should fail if mintData.from is not message sender', async function () {
        const {
          assetMinterContract,
          catalystOwner,
          user3,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = await assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const assetQuantities = [];
        const assetTypeIds = [];
        for (const asset of assetWOCatalyst) {
          assetQuantities.push(
            await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(asset.Id)
          );
          assetTypeIds.push(asset.Id);
        }
        assetQuantities.reverse();
        assetTypeIds.reverse();
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithoutCatalyst(
            {
              from: user3,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetQuantities,
            assetTypeIds
          )
        ).to.be.revertedWith('AUTH_ACCESS_DENIED');
      });
      it('mintMultipleWithoutCatalyst should fail if supplies array has wrong value', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = await assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const assetTypeIds = [];
        for (const asset of assetWOCatalyst) {
          assetTypeIds.push(asset.Id);
        }
        assetTypeIds.reverse();
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithoutCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [0, 0],
            assetTypeIds
          )
        ).to.be.revertedWith(
          'AssetMinter: Invalid quantitiesByAssetType value'
        );
      });
      it('mintMultipleWithoutCatalyst should fail if supplies array and assetTypeIds array has difrent length', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = await assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const assetQuantities = [];
        const assetTypeIds = [];
        for (const asset of assetWOCatalyst) {
          assetQuantities.push(
            await assetMinterAsCatalystOwner.quantitiesByAssetTypeId(asset.Id)
          );
          assetTypeIds.push(asset.Id);
        }
        assetQuantities.reverse();
        assetTypeIds.reverse();
        assetTypeIds.push(1);
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithoutCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetQuantities,
            assetTypeIds
          )
        ).to.be.revertedWith(
          'AssetMinter: supplies and assets length mismatch'
        );
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
        const numberOfGemsBurnPerAsset = await assetMinterAsUser3.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsUser3.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [1],
            catalystId: 1,
          },
          {
            gemIds: [3],
            catalystId: 2,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsUser3.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }

        await expect(
          assetMinterAsUser3.mintMultipleWithCatalyst(
            {
              from: user3,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetArray,
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [],
            [],
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          1
        );
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [
              {
                gemIds: [1, 1, 1],
                catalystId: 1,
              },
            ],
            [quantitiesByCatalystId],
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('AssetMinter: too many gems');
      });

      it('mintMultiple: should fail if gemsId = 6', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const quantitiesByCatalystId = await assetMinterAsCatalystOwner.quantitiesByCatalystId(
          1
        );
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [
              {
                gemIds: [6],
                catalystId: 1,
              },
            ],
            [quantitiesByCatalystId],
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('AssetMinter: gemId out of bound');
      });
      it('mintMultiple: should fail if catalystsId = 5', async function () {
        const {
          assetMinterContract,
          catalystOwner,
        } = await setupAssetMinterGemsAndCatalysts();
        const assetMinterAsCatalystOwner = assetMinterContract.connect(
          ethers.provider.getSigner(catalystOwner)
        );
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [
              {
                gemIds: [5],
                catalystId: 5,
              },
            ],
            [4],
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('AssetMinter: catalystID out of bound');
      });

      it('mintMultiple: should not set catalyst if catalystId == 0', async function () {
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            [
              {
                gemIds: [1],
                catalystId: 0,
              },
            ],
            [4],
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith('AssetMinter: catalystID out of bound');
      });
      it('mintMultiple: should fail if assets length and supplies length differ', async function () {
        const {
          catalystOwner,
          powerGem,
          defenseGem,
          speedGem,
          commonCatalyst,
          rareCatalyst,
          epicCatalyst,
          assetMinterContract,
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [1],
            catalystId: commonCataId,
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
            catalystId: legendaryCataId,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsCatalystOwner.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }
        quantitiesByCatalystId.push(100);

        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetArray,
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith(
          'AssetMinter: supplies and assets length mismatch'
        );
      });
      it('mintMultiple: should fail if numberOfCatalystBurnPerAsset differ', async function () {
        const {
          catalystOwner,
          powerGem,
          defenseGem,
          speedGem,
          commonCatalyst,
          rareCatalyst,
          epicCatalyst,
          assetMinterContract,
          assetMinterContractAsOwner,
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [1],
            catalystId: commonCataId,
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
            catalystId: legendaryCataId,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsCatalystOwner.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }
        await assetMinterContractAsOwner.setNumberOfCatalystsBurnPerAsset(
          numberOfCatalystBurnPerAsset + 1
        );

        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetArray,
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith(
          'AssetMinter: invalid numberOfCatalystBurnPerAsset value'
        );
      });
      it('mintMultiple: should fail if numberOfGemsBurnPerAsset differ', async function () {
        const {
          catalystOwner,
          powerGem,
          defenseGem,
          speedGem,
          commonCatalyst,
          rareCatalyst,
          epicCatalyst,
          assetMinterContract,
          assetMinterContractAsOwner,
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [1],
            catalystId: commonCataId,
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
            catalystId: legendaryCataId,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(
            await assetMinterAsCatalystOwner.quantitiesByCatalystId(
              assetArray[i].catalystId
            )
          );
        }
        await assetMinterContractAsOwner.setNumberOfGemsBurnPerAsset(
          numberOfGemsBurnPerAsset + 1
        );

        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetArray,
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith(
          'AssetMinter: invalid numberOfGemsBurnPerAsset value'
        );
      });
      it('mintMultiple: should fail if supplies has in valid values', async function () {
        const {
          catalystOwner,
          powerGem,
          defenseGem,
          speedGem,
          commonCatalyst,
          rareCatalyst,
          epicCatalyst,
          assetMinterContract,
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
        const numberOfGemsBurnPerAsset = await assetMinterAsCatalystOwner.numberOfGemsBurnPerAsset();
        const numberOfCatalystBurnPerAsset = await assetMinterAsCatalystOwner.numberOfCatalystBurnPerAsset();
        const assetArray = [
          {
            gemIds: [1],
            catalystId: commonCataId,
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
            catalystId: legendaryCataId,
          },
        ];
        const quantitiesByCatalystId = [];
        for (let i = 0; i < assetArray.length; i++) {
          quantitiesByCatalystId.push(i);
        }

        await expect(
          assetMinterAsCatalystOwner.mintMultipleWithCatalyst(
            {
              from: catalystOwner,
              to: catalystOwner,
              packId: mintMultiOptions.packId,
              metadataHash: mintMultiOptions.metadataHash,
              data: mintMultiOptions.data,
            },
            assetArray,
            quantitiesByCatalystId,
            numberOfCatalystBurnPerAsset,
            numberOfGemsBurnPerAsset
          )
        ).to.be.revertedWith(
          'AssetMinter: Invalid quantitiesByAssetType value'
        );
      });
    });
  });
});
