import {ethers, getNamedAccounts} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {Address, Receipt} from 'hardhat-deploy/types';
import {expectEventWithArgsFromReceipt} from '../utils';

const emptyBytes = '0x';
const dummyHash =
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
  const {assetBouncerAdmin, assetAdmin} = await getNamedAccounts();

  // ------------ ERC1155 -------------
  const asset1155Contract = await ethers.getContract(
    'Asset',
    assetBouncerAdmin
  );

  await asset1155Contract.setBouncer(assetAdmin, true);

  const assetReceipts: Receipt[] = [];

  const assetAsAdmin = await asset1155Contract.connect(
    ethers.provider.getSigner(assetAdmin)
  );
  packId = 0;
  for (let i = 0; i < supplies.length; i++) {
    assetReceipts.push(
      await assetAsAdmin['mint(address,uint40,bytes32,uint256,address,bytes)'](
        creator,
        packId,
        dummyHash,
        supplies[i],
        creator,
        emptyBytes
      )
    );
    packId++;
  }

  const assetsFromReceipts = await getAssetsFromReceipts(
    assetAsAdmin,
    assetReceipts
  );
  return assetsFromReceipts;
}

export async function supplyAssets721(
  creator: Address,
  nbAssets: number
): Promise<BigNumber[]> {
  const {assetAdmin} = await getNamedAccounts();

  // ------------ ERC721 -------------

  const asset721Contract = await ethers.getContract('AssetERC721', assetAdmin);
  const assetReceipts721: Receipt[] = [];

  const asset721AsAdmin = await asset721Contract.connect(
    ethers.provider.getSigner(assetAdmin)
  );
  const MINTER_ROLE = await asset721Contract.MINTER_ROLE();
  await asset721AsAdmin.grantRole(MINTER_ROLE, assetAdmin);

  for (let i = 0; i < nbAssets; i++) {
    assetReceipts721.push(
      await asset721AsAdmin['mint(address,uint256)'](creator, i)
    );
  }

  const assetsFromReceipts = await getAssets721FromReceipts(
    asset721AsAdmin,
    assetReceipts721
  );
  return assetsFromReceipts;
}
