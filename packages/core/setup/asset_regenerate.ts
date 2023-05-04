import {BigNumber} from 'ethers';
import fs from 'fs-extra';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const readOnly = false;
const MINT_BATCH_SIZE = 100;
const EXTRACTION_BATCH_SIZE = 100;

let totalGasUsed = BigNumber.from(0);

function generateRaritiesPack(raritiesArr: number[]) {
  let raritiesPack = '0x';
  for (let i = 0; i < raritiesArr.length; i += 4) {
    let byteV = 0;
    for (let j = i; j < raritiesArr.length && j < i + 4; j++) {
      if (raritiesArr[j] > 3) {
        throw new Error('rarity > 3');
      }
      const p = Math.pow(2, (3 - (j - i)) * 2);
      byteV += raritiesArr[j] * p;
    }
    let s = byteV.toString(16);
    if (s.length === 1) {
      s = '0' + s;
    }
    raritiesPack += s;
  }
  return raritiesPack;
}

const func: DeployFunction = async function () {
  const {ethers, getNamedAccounts} = hre;

  const gasPriceFromNode = await ethers.provider.getGasPrice();
  let gasPrice = gasPriceFromNode;
  if (hre.network.name === 'mainnet') {
    gasPrice = BigNumber.from('56000000000'); // TODO allow it to be passed as parameter to the script
  }
  console.log({
    gasPriceFromNode: gasPriceFromNode.toString(),
    gasPrice: gasPrice.toString(),
  });

  const {deployer} = await getNamedAccounts();
  const DeployerBatch = await ethers.getContract('DeployerBatch', deployer);

  console.log({DeployerBatch: DeployerBatch.address});

  const Asset = await ethers.getContract('Asset');

  const {batchMints, extractions} = fs.readJSONSync(
    'tmp/asset_regenerations.json'
  );

  type MintBatch = {
    creator: string;
    packID: string;
    ipfsHash: string;
    supplies: number[];
    rarities: number[];
  };

  console.log({batchMints: batchMints.length});

  const batchBatches: MintBatch[][] = [];

  let currentBatch: MintBatch[] = [];
  for (const batch of batchMints) {
    if (currentBatch.length >= MINT_BATCH_SIZE) {
      batchBatches.push(currentBatch);
      currentBatch = [];
    }
    const {creator, packID, supplies, ipfsHash, rarities, numFTs} = batch;
    const packIdUsed = await Asset.callStatic.isPackIdUsed(
      creator,
      packID,
      numFTs
    );
    if (!packIdUsed) {
      currentBatch.push({
        creator,
        packID,
        ipfsHash,
        supplies,
        rarities,
      });
    } else {
      console.log(
        `creator (${creator}) packID ${packID} numFTs ${numFTs} already minted`
      );
    }
  }
  if (currentBatch.length > 0) {
    batchBatches.push(currentBatch);
  }

  console.log({batchBatches: batchBatches.length});

  for (const batchBatch of batchBatches) {
    const datas = [];
    for (const batch of batchBatch) {
      const {creator, packID, supplies, ipfsHash, rarities} = batch;
      const raritiesPack = generateRaritiesPack(rarities);
      const {data} = await Asset.populateTransaction.mintMultiple(
        creator,
        packID,
        ipfsHash,
        supplies,
        raritiesPack,
        DeployerBatch.address,
        '0x'
      );
      datas.push(data);
    }
    if (!readOnly) {
      const tx = await DeployerBatch.singleTargetAtomicBatch(
        Asset.address,
        datas,
        {gasPrice}
      );
      console.log(`batchMint`, {
        tx: tx.hash,
      });
      const receipt = await tx.wait();
      const TransferBatchEvents = await Asset.queryFilter(
        Asset.filters.TransferBatch(),
        receipt.blockNumber
      );
      console.log({
        TransferBatchEvents: TransferBatchEvents.length,
      });
      const gasUsed = receipt.gasUsed;
      totalGasUsed = totalGasUsed.add(gasUsed);
      console.log({
        gasUsed: gasUsed.toString(),
        totalGasUsed: totalGasUsed.toString(),
      });
    } else {
      console.log(`batchMint`, datas.length);
    }
  }

  type Extraction = {
    id: string;
    extractTo: string;
  };
  const extractionBatches: Extraction[][] = [];
  let currentExtractionBatch: Extraction[] = [];
  for (const extraction of extractions) {
    if (currentExtractionBatch.length >= EXTRACTION_BATCH_SIZE) {
      extractionBatches.push(currentExtractionBatch);
      currentExtractionBatch = [];
    }
    const exists = await Asset.wasEverMinted(extraction.extractedTokenId);
    if (!exists) {
      let extractTo = extraction.to;
      if (extractTo === '') {
        extractTo = DeployerBatch.address; // the token will be transfered as part of the transfer phase
      }
      currentExtractionBatch.push({
        id: extraction.id,
        extractTo: extractTo,
      });
    } else {
      console.log(`already extracted ${extraction.extractedTokenId}`);
    }
  }
  if (currentExtractionBatch.length > 0) {
    extractionBatches.push(currentExtractionBatch);
  }

  console.log({extractionBatches: extractionBatches.length});

  for (const extractionBatch of extractionBatches) {
    const datas = [];
    for (const extraction of extractionBatch) {
      const {data} = await Asset.populateTransaction.extractERC721(
        extraction.id,
        extraction.extractTo
      );
      datas.push(data);
    }
    if (!readOnly) {
      const tx = await DeployerBatch.singleTargetAtomicBatch(
        Asset.address,
        datas,
        {gasPrice}
      );
      console.log(`extracting`, {tx: tx.hash});
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      totalGasUsed = totalGasUsed.add(gasUsed);
      console.log({
        gasUsed: gasUsed.toString(),
        totalGasUsed: totalGasUsed.toString(),
      });
    } else {
      console.log(`extracting`, datas.length);
    }
  }
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
