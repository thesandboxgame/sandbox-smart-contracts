import {ethers, getNamedAccounts} from 'hardhat';
import {utils, BigNumber, Contract} from 'ethers';
import {Address, Receipt} from 'hardhat-deploy/types';
import {expectEventWithArgsFromReceipt} from '../utils';

const emptyBytes = '0x';
const rarity = 3;
let dummyHash =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

let packId = 0;

async function getAssetsFromReceipts(
  assetContract: Contract,
  receipts: Receipt[]
): Promise<BigNumber[]> {
  let rec: Receipt;
  const assets: BigNumber[] = [];
  for (rec of receipts) {
    const event = await expectEventWithArgsFromReceipt(
      assetContract,
      rec,
      'TransferSingle'
    );
    const id = event.args[3];
    assets.push(id);
  }
  return assets;
}

export async function supplyAssets(
  creator: Address,
  supplies: number[]
): Promise<BigNumber[]> {
  const {assetBouncerAdmin, assetAdmin} = await getNamedAccounts();
  const assetContract = await ethers.getContract('Asset');
  const assetAsBouncerAdmin = await assetContract.connect(
    ethers.provider.getSigner(assetBouncerAdmin)
  );
  const assetAsAdmin = await assetContract.connect(
    ethers.provider.getSigner(assetAdmin)
  );

  await assetAsBouncerAdmin.setBouncer(assetAdmin, true);
  const assetReceipts: Receipt[] = [];

  for (let i = 0; i < supplies.length; i++) {
    assetReceipts.push(
      await assetAsAdmin.mint(
        creator,
        packId,
        dummyHash,
        supplies[i],
        rarity,
        creator,
        emptyBytes
      )
    );
    packId++;
    const hashAsNum = BigNumber.from(dummyHash);
    const incrementedHash = hashAsNum.add(1);
    dummyHash = utils.hexZeroPad(utils.hexValue(incrementedHash), 32);
  }

  return await getAssetsFromReceipts(assetContract, assetReceipts);
}

export default supplyAssets;
