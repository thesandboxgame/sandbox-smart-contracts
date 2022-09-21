import {AbiCoder} from 'ethers/lib/utils';
import fs from 'fs-extra';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from 'ethers';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idsUsed: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hashesUsed: any = {};

  const mask =
    '0xffffffffffffffffffffffffffffffffffffffff000000007ffffffffffff800';

  for (const batch of batches) {
    // If metadatahash is not set in the new contract, we can use the mint function
    // Otherwise we use the mintDeficit function
    const datasForMint = [];
    const datasForMintDeficit = [];
    for (const {to, id, supply, data} of batch) {
      const hash = await read('Asset', 'metadataHash', id);
      const uriHelper = BigNumber.from(id).and(BigNumber.from(mask));
      if (
        idsUsed[id] === undefined && // id has not been used in batch
        hashesUsed[uriHelper.toString()] === undefined && // uri has not been taken by a previous (same or different) id in batch
        hash ==
          '0x0000000000000000000000000000000000000000000000000000000000000000' // hash has not been minted in a previous batch
      ) {
        const populatedTx = await Asset.populateTransaction[
          'mint(address,uint256,uint256,bytes)'
        ](to, id, supply, data);
        datasForMint.push(populatedTx.data);
        idsUsed[id] = true;
        hashesUsed[
          BigNumber.from(id).and(BigNumber.from(mask)).toString()
        ] = true;
      } else {
        const populatedTx = await Asset.populateTransaction[
          'mintDeficit(address,uint256,uint256)'
        ](to, id, supply);
        datasForMintDeficit.push(populatedTx.data);
      }
    }

    console.log(`mint: ${datasForMint.length}`);
    const txA = await execute(
      'DeployerBatch',
      {from: deployer, gasPrice},
      'singleTargetAtomicBatch',
      Asset.address,
      datasForMint
    );
    console.log(`batchMint`, {
      tx: txA.transactionHash,
    });

    console.log(`mintDeficit: ${datasForMintDeficit.length}`);
    const txB = await execute(
      'DeployerBatch',
      {from: deployer, gasPrice},
      'singleTargetAtomicBatch',
      Asset.address,
      datasForMintDeficit
    );
    console.log(`batchMintDeficit`, {
      tx: txB.transactionHash,
    });
  }

  // Disable BatchDeployer as bouncer and reinstate predicate as AssetERC1155Tunnel again (only bridge is allowed to mint on L1)
  // Must be able to find deployment for AssetERC1155Tunnel so make sure the tunnel has been deployed by this point
  await removeBatchDeployerAsAssetBouncerAndPredicate(hre);
};

export default func;

if (require.main === module) void func(hre);
