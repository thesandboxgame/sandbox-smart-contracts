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
  data: string;
};

const func: DeployFunction = async function () {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const DeployerBatch = await deployments.get('DeployerBatch');
  const AssetERC721 = await ethers.getContract('AssetERC721');

  const gasPrice = await (await ethers.provider.getGasPrice()).toString();
  const {deployer, assetAdmin} = await getNamedAccounts();

  const batchMints: {
    id: string;
    owner: string;
    tokenURI?: string;
    isContract?: boolean;
  }[] = fs.readJSONSync('tmp/asset721_regenerations.json');
  console.log({batchMints: batchMints.length});
  const batches: MintBatch[][] = [];
  let currentBatch: MintBatch[] = [];
  for (const batch of batchMints) {
    if (currentBatch.length >= MINT_BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    const exists = await read('AssetERC721', 'exists', batch.id);
    if (!exists) {
      batch.tokenURI =
        batch.tokenURI || (await read('Asset', 'tokenURI', batch.id));
      batch.isContract = batch.isContract || (await isContract(batch.owner));
      if (batch.isContract) {
        console.log('skipping:', {owner: batch.owner, id: batch.id});
        continue;
      }
      const metadata = abiCoder.encode(['string'], [batch.tokenURI || '']);
      currentBatch.push({
        to: batch.owner,
        id: batch.id,
        data: metadata,
      });
    } else {
      console.log(`id (${batch.id}) already minted`);
    }
  }
  fs.outputJSONSync('tmp/asset721_regenerations.json', batchMints);
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  console.log({batches: batches.length});
  if (batches.length === 0) return;
  const mintRole = await read('AssetERC721', 'MINTER_ROLE');
  const isMinter = await read(
    'AssetERC721',
    'hasRole',
    mintRole,
    DeployerBatch.address
  );
  if (!isMinter) {
    console.log('DeployerBatch is not a minter');
    await catchUnknownSigner(
      execute(
        'AssetERC721',
        {from: assetAdmin, log: true},
        'grantRole',
        mintRole,
        DeployerBatch.address
      )
    );
  }
  const datas = [];
  for (const batch of batches) {
    for (const {to, id, data} of batch) {
      const populatedTx = await AssetERC721.populateTransaction[
        'mint(address,uint256,bytes)'
      ](to, id, data);
      datas.push(populatedTx.data);
    }
    console.log({minting: batch.length});
    const tx = await execute(
      'DeployerBatch',
      {from: deployer, gasPrice},
      'singleTargetAtomicBatch',
      AssetERC721.address,
      datas
    );
    console.log(`batchMint`, {
      tx: tx.transactionHash,
    });
  }
};

export default func;

if (require.main === module) void func(hre);
