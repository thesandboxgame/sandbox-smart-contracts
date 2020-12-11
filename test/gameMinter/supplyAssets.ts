import {Address, Receipt} from 'hardhat-deploy/types';
import {utils, BigNumber} from 'ethers';
import {deployments, getNamedAccounts} from 'hardhat';

const emptyBytes = '0x';
const rarity = 3;
let dummyHash =
  // '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
  '0x0000000000000000000000000000000000000000000000000000000000000001';

let packId = 0;

export async function supplyAssets(
  creator: Address,
  owner: Address,
  supply: number
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
  const assetReceipt: Receipt = await execute(
    'Asset',
    {from: assetAdmin, log: true},
    'mint',
    creator,
    packId,
    dummyHash,
    supply,
    rarity,
    creator,
    emptyBytes
  );
  packId++;
  const hashAsNum = BigNumber.from(dummyHash);
  const incrementedHash = hashAsNum.add(1);
  dummyHash = utils.hexZeroPad(utils.hexValue(incrementedHash), 32);
  return assetReceipt;
}

export default supplyAssets;
