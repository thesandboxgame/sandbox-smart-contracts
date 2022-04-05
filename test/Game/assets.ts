import {ethers, getNamedAccounts} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {Address, Receipt} from 'hardhat-deploy/types';
import {expectEventWithArgsFromReceipt} from '../utils';

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

async function getAssets721FromReceipts(
  assetContract: Contract,
  receipts: Receipt[]
): Promise<BigNumber[]> {
  let rec: Receipt;
  const assets: BigNumber[] = [];
  for (rec of receipts) {
    const event = await expectEventWithArgsFromReceipt(
      assetContract,
      rec,
      'Transfer'
    );
    const id = event.args[2];
    assets.push(id);
  }
  return assets;
}

export async function supplyAssets(
  creator: Address,
  supplies: number[]
): Promise<BigNumber[]> {
  const {assetAdmin} = await getNamedAccounts();

  // ------------ ERC1155 -------------
  const asset1155Contract = await ethers.getContract(
    'GameAsset1155',
    assetAdmin
  );
  const assetReceipts1155: Receipt[] = [];

  const asset1155AsAdmin = await asset1155Contract.connect(
    ethers.provider.getSigner(assetAdmin)
  );
  packId = 0;
  for (let i = 0; i < supplies.length; i++) {
    assetReceipts1155.push(
      await asset1155AsAdmin.mint(creator, packId, supplies[i], '0x00')
    );
    packId++;
  }

  const assetsFromReceipts = await getAssetsFromReceipts(
    asset1155AsAdmin,
    assetReceipts1155
  );
  return assetsFromReceipts;
}

export async function supplyAssets721(
  creator: Address,
  nbAssets: number
): Promise<BigNumber[]> {
  const {assetAdmin} = await getNamedAccounts();

  // ------------ ERC721 -------------

  const asset721Contract = await ethers.getContract('GameAsset721', assetAdmin);
  const assetReceipts721: Receipt[] = [];

  const asset721AsAdmin = await asset721Contract.connect(
    ethers.provider.getSigner(assetAdmin)
  );

  packId = 0;
  for (let i = 0; i < nbAssets; i++) {
    assetReceipts721.push(await asset721AsAdmin.mint(creator));
    packId++;
  }

  const assetsFromReceipts = await getAssets721FromReceipts(
    asset721AsAdmin,
    assetReceipts721
  );
  return assetsFromReceipts;
}
