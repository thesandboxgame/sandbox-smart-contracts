import {ethers, getNamedAccounts} from 'hardhat';
import {utils, BigNumber, Contract} from 'ethers';
import {Address, Receipt} from 'hardhat-deploy/types';
import {expectEventWithArgsFromReceipt} from '../utils';

const emptyBytes = '0x';
const rarity = 3;
let dummyHash =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

let packId = 0;

type AssetsObj = {
  assets: BigNumber[];
  quantities: number[];
};

async function getAssetsFromReceipts(
  assetContract: Contract,
  receipts: Receipt[]
): Promise<AssetsObj> {
  let rec: Receipt;
  const assets: BigNumber[] = [];
  const quantities: number[] = [];
  for (rec of receipts) {
    const event = await expectEventWithArgsFromReceipt(
      assetContract,
      rec,
      'TransferSingle'
    );
    const id = event.args[3];
    const amount = event.args[4];
    assets.push(id);
    quantities.push(amount);
  }
  return {assets, quantities};
}

export async function supplyAssets(
  creator: Address,
  owner: Address,
  supplies: number[]
): Promise<AssetsObj> {
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
