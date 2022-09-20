import {AbiCoder} from 'ethers/lib/utils';
import fs from 'fs-extra';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {isContract} from '../utils/address';
import {toHash} from '../utils/asset-uri-to-hash';
import setupBatchDeployerAsAssetBouncerAndPredicate from '../deploy/10_helpers/04_asset_bouncer_enable_deployer_batch_and_predicate';
import removeBatchDeployerAsAssetBouncerAndPredicate from '../deploy/10_helpers/05_asset_bouncer_disable_deployer_batch_and_predicate';

const abiCoder = new AbiCoder();

const MINT_BATCH_SIZE = 100;

type MintBatch = {
  to: string;
  id: string;
  supply: number;
  data: string;
};

// File mints AssetERC1155 from file containing { id, owner, supply, uri?, isContract? }
// Necessary to migrate AssetERC1155 from previous version on Goerli ("OldAsset") to new contract (replacement not upgrade;
// this is to ensure aligned upgrade version on Goerli and Mainnet)

const func: DeployFunction = async function () {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {read, execute} = deployments;
  const Asset = await ethers.getContract('Asset');
  console.log('Asset address: ' + Asset.address);

  // Read old AssetERC1155ERC721 for ERC1155 uri
  // As there is no artifact for AssetV1 we can use ERC1155ERC721
  const OldAsset = await ethers.getContractAt(
    'ERC1155ERC721',
    '0xf050cDB34C8f39d24eD12678Dc5Ab32BE8672AfE' // ** ASSETV1 ON GOERLI **
  );

  const gasPrice = await (await ethers.provider.getGasPrice()).toString();
  const {deployer} = await getNamedAccounts();

  const batchMints: {
    id: string;
    owner: string;
    supply: number;
    isContract?: boolean;
  }[] = fs.readJSONSync('tmp/assets_for_remint.json');
  console.log({batchMints: batchMints.length});
  const batches: MintBatch[][] = [];
  let currentBatch: MintBatch[] = [];
  for (const batch of batchMints) {
    if (currentBatch.length >= MINT_BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    // Make sure the Asset contract has been upgraded by this point
    const hashExists = await read('Asset', 'doesHashExist', batch.id);
    if (!hashExists) {
      const uri = await OldAsset.tokenURI(batch.id);
      batch.isContract = batch.isContract || (await isContract(batch.owner));

      if (batch.isContract) {
        console.log('skipping:', {
          owner: batch.owner,
          id: batch.id,
          supply: batch.supply,
          uri,
        });
        continue;
      }

      // Encoded bytes32 metadata hash must be provided as data
      // Hash must have length for tx to succeed
      const metadata = abiCoder.encode(['bytes32'], [toHash(uri)]);

      currentBatch.push({
        to: batch.owner,
        id: batch.id,
        supply: batch.supply,
        data: metadata,
      });
    } else {
      console.log(`id (${batch.id}) already minted`);
    }
  }
  fs.outputJSONSync('tmp/assets_for_remint.json', batchMints);
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  console.log({batches: batches.length});
  if (batches.length === 0) return;

  // Set up BatchDeployer as bouncer and set predicate as DeployerBatch (only bridge is allowed to mint on L1)
  await setupBatchDeployerAsAssetBouncerAndPredicate(hre);

  // If metadatahash is not set in the new contract for a given ID, we can use the mint function
  // Otherwise we should be able to use the mintDeficit function
  const datas = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idsUsed: any = {};
  for (const batch of batches) {
    for (const {to, id, supply, data} of batch) {
      if (idsUsed[id] == false) {
        const populatedTx = await Asset.populateTransaction[
          'mint(address,uint256,uint256,bytes)'
        ](to, id, supply, data);
        datas.push(populatedTx.data);
        idsUsed[id] = true;
      } else {
        const populatedTx = await Asset.populateTransaction[
          'mintDeficit(address,uint256,uint256)'
        ](to, id, supply);
        datas.push(populatedTx.data);
      }
    }
    console.log({minting: batch.length});
    const tx = await execute(
      'DeployerBatch',
      {from: deployer, gasPrice},
      'singleTargetAtomicBatch',
      Asset.address,
      datas
    );
    console.log(`batchMint`, {
      tx: tx.transactionHash,
    });
  }

  // Disable BatchDeployer as bouncer and reinstate predicate as AssetERC1155Tunnel again (only bridge is allowed to mint on L1)
  // Must be able to find deployment for AssetERC1155Tunnel so make sure the tunnel has been deployed by this point
  await removeBatchDeployerAsAssetBouncerAndPredicate(hre);
};

export default func;

if (require.main === module) void func(hre);
