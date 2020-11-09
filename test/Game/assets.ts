import {Address, Receipt} from 'hardhat-deploy/types';
import {deployments, getNamedAccounts} from 'hardhat';

const emptyBytes = '0x';
const rarity = 3;

export async function supplyAssets(
  creator: Address,
  packId: number,
  owner: Address,
  supply: number,
  hash: string
): Promise<Receipt> {
  const {execute} = deployments;
  const {assetBouncerAdmin, assetAdmin} = await getNamedAccounts();

  await execute(
    'Asset',
    {from: assetBouncerAdmin, log: true},
    'setBouncer',
    assetAdmin,
    true
  );

  const assetReceipt = await execute(
    'Asset',
    {from: assetAdmin, log: true},
    'mint',
    creator,
    packId,
    hash,
    supply,
    rarity,
    creator,
    emptyBytes
  );
  return assetReceipt;
}

export default supplyAssets;
