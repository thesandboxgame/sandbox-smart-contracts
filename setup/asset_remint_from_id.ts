import {AbiCoder} from 'ethers/lib/utils';
import fs from 'fs-extra';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {isContract} from '../utils/address';
const abiCoder = new AbiCoder();

const MINT_BATCH_SIZE = 100;

type MintBatch = {
  to: string;
  id: string;
  supply: number;
  data: string;
};

// File mints AssetERC1155 from file containing { id, owner, supply, uri?, isContract? }
// Necessary to migrate AssetERC1155 from previous version on Goerli to new contract replacement

const func: DeployFunction = async function () {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const DeployerBatch = await deployments.get('DeployerBatch');
  const Asset = await ethers.getContract('Asset');

  const gasPrice = await (await ethers.provider.getGasPrice()).toString();
  const {deployer, assetAdmin} = await getNamedAccounts();

  const batchMints: {
    id: string;
    owner: string;
    supply: number;
    uri?: string;
    isContract?: boolean;
  }[] = fs.readJSONSync('tmp/asset_for_remint.json');
  console.log({batchMints: batchMints.length});
  const batches: MintBatch[][] = [];
  let currentBatch: MintBatch[] = [];
  for (const batch of batchMints) {
    if (currentBatch.length >= MINT_BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    const exists = await read('Asset', 'exists', batch.id);
    if (!exists) {
      batch.uri =
        batch.uri || (await read('Asset', 'uri', batch.id)); // TODO: Needs to be OLD contract AND OLD version being read
      batch.isContract = batch.isContract || (await isContract(batch.owner));

      // TODO: get supply

      if (batch.isContract) {
        console.log('skipping:', {owner: batch.owner, id: batch.id, supply: batch.supply});
        continue;
      }
      // TODO: need to encode just the metadatahash, not full uri, convert uri to hash
      let hash = '0x'


      // TODO: Encoded bytes32 metadata hash must be provided as data
      // Hash must have length for tx to succeed
      const metadata = abiCoder.encode(['bytes32'], [hash]);
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
  fs.outputJSONSync('tmp/asset_reminted.json', batchMints);
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  console.log({batches: batches.length});
  if (batches.length === 0) return;
  const mintRole = await read('Asset', 'MINTER_ROLE'); // TODO: bouncer ?
  const isMinter = await read(
    'Asset',
    'hasRole',
    mintRole,
    DeployerBatch.address
  );
  if (!isMinter) {
    console.log('DeployerBatch is not a minter');
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: assetAdmin, log: true},
        'grantRole',
        mintRole,
        DeployerBatch.address
      )
    );
  }
  const datas = [];
  for (const batch of batches) {
    for (const {to, id, supply, data} of batch) {
      // TODO: needs to be NEW contract version for minting i.e. after upgrade
      const populatedTx = await Asset.populateTransaction[
        'mint(address,uint256,uint256,bytes)'
      ](to, id, supply, data);
      datas.push(populatedTx.data);
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
};

export default func;

if (require.main === module) void func(hre);
