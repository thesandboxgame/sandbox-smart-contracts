import {BigNumber, Contract} from 'ethers';
import {ethers, getNamedAccounts} from 'hardhat';
import {waitFor} from '../../scripts/utils/utils';

export async function mintAsset(minter: string, supply: number) {
  const {assetBouncerAdmin} = await getNamedAccounts();
  const assetContract = await ethers.getContract('Asset');

  await waitFor(
    assetContract
      .connect(ethers.provider.getSigner(assetBouncerAdmin))
      .setBouncer(assetBouncerAdmin, true)
  );

  const assetId = await assetContract
    .connect(ethers.provider.getSigner(assetBouncerAdmin))
    .callStatic.mint(
      minter,
      22,
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      1,
      1,
      minter,
      Buffer.from('data')
    );

  await waitFor(
    assetContract
      .connect(ethers.provider.getSigner(assetBouncerAdmin))
      .mint(
        minter,
        22,
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        supply,
        0,
        minter,
        Buffer.from('data')
      )
  );
  return assetId;
}
export async function changeCatalyst(
  assetUpgraderContract: Contract,
  from: string,
  assetId: string,
  catalystId: string,
  gemsIds: string[],
  to: string
) {
  await waitFor(
    assetUpgraderContract
      .connect(ethers.provider.getSigner(from))
      .changeCatalyst(from, assetId, catalystId, gemsIds, to)
  );
}
export async function transferSand(
  sandContract: Contract,
  to: string,
  amount: BigNumber
) {
  const {sandBeneficiary} = await getNamedAccounts();
  await waitFor(
    sandContract
      .connect(ethers.provider.getSigner(sandBeneficiary))
      .transfer(to, amount)
  );
}
export async function mintCatalyst(
  catalystContract: Contract,
  mintingAmount: BigNumber,
  beneficiary: string
) {
  const {catalystMinter} = await getNamedAccounts();

  await waitFor(
    catalystContract
      .connect(ethers.provider.getSigner(catalystMinter))
      .mint(beneficiary, mintingAmount)
  );
}
export async function mintGem(
  gemContract: Contract,
  mintingAmount: BigNumber,
  beneficiary: string
) {
  const {gemMinter} = await getNamedAccounts();

  await waitFor(
    gemContract
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(beneficiary, mintingAmount)
  );
}
