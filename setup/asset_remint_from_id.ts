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
// Necessary to migrate AssetERC1155 from previous version on Goerli ("OldAsset") to new contract replacement
// This is to ensure aligned upgrade version on Goerli and Mainnet

const func: DeployFunction = async function () {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const DeployerBatch = await deployments.get('DeployerBatch');
  const Asset = await ethers.getContract('Asset');
  console.log('Asset address: ' + Asset.address);

  // Read old AssetERC1155ERC721 for ERC1155 uri
  // As there is no artifact for AssetV1 we can use ERC1155ERC721
  const OldAsset = await ethers.getContractAt(
    'ERC1155ERC721',
    '0xf050cDB34C8f39d24eD12678Dc5Ab32BE8672AfE' // ** ASSETV1 ON GOERLI **
  );

  const gasPrice = await (await ethers.provider.getGasPrice()).toString();
  const {deployer, assetAdmin} = await getNamedAccounts();

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
    const exists = await read('Asset', 'exists', batch.id); // function only on contract after upgrade
    if (!exists) {
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
      // We have the uri but we need to encode just the metadatahash, not the full uri, so we convert the uri to hash
      // uri is formed of: "ipfs://bafybei",hash2base32(hash),"/",uint2str(id & PACK_INDEX),".json"

      // Get hash2base32(hash)
      const array = uri.split('/');
      const hash = array[2].slice(7);
      // TODO:
      console.log('hash: ' + hash);

      // Convert hash2base32(hash) to actual hash for encoding
      // TODO:

      // Encoded bytes32 metadata hash must be provided as data
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
  // fs.outputJSONSync('tmp/assets_for_remint.json', batchMints);
  // if (currentBatch.length > 0) {
  //   batches.push(currentBatch);
  // }
  // console.log({batches: batches.length});
  // if (batches.length === 0) return;
  // const mintRole = await read('Asset', 'MINTER_ROLE');
  // const isMinter = await read(
  //   'Asset',
  //   'hasRole',
  //   mintRole,
  //   DeployerBatch.address
  // );
  // if (!isMinter) {
  //   console.log('DeployerBatch is not a minter');
  //   await catchUnknownSigner(
  //     execute(
  //       'Asset',
  //       {from: assetAdmin, log: true},
  //       'grantRole',
  //       mintRole,
  //       DeployerBatch.address
  //     )
  //   );
  // }
  // const datas = [];
  // for (const batch of batches) {
  //   for (const {to, id, supply, data} of batch) {
  //     const populatedTx = await Asset.populateTransaction[
  //       'mint(address,uint256,uint256,bytes)'
  //     ](to, id, supply, data);
  //     datas.push(populatedTx.data);
  //   }
  //   console.log({minting: batch.length});
  //   const tx = await execute(
  //     'DeployerBatch',
  //     {from: deployer, gasPrice},
  //     'singleTargetAtomicBatch',
  //     Asset.address,
  //     datas
  //   );
  //   console.log(`batchMint`, {
  //     tx: tx.transactionHash,
  //   });
  // }
};

export default func;

if (require.main === module) void func(hre);
