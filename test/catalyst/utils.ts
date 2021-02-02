import {BigNumber, Contract, Event} from 'ethers';
import {ethers, getNamedAccounts} from 'hardhat';
import {Receipt} from 'hardhat-deploy/types';
import {waitFor} from '../../scripts/utils/utils';
import {findEvents} from '../utils';

export async function mintAsset(
  creator: string,
  packId: BigNumber,
  hash: string,
  supply: number | BigNumber,
  rarity: number,
  owner: string,
  callData: Buffer
): Promise<BigNumber> {
  const {assetBouncerAdmin} = await getNamedAccounts();
  const assetContract = await ethers.getContract('Asset');

  await waitFor(
    assetContract
      .connect(ethers.provider.getSigner(assetBouncerAdmin))
      .setBouncer(assetBouncerAdmin, true)
  );

  const assetId = await assetContract
    .connect(ethers.provider.getSigner(assetBouncerAdmin))
    .callStatic.mint(creator, packId, hash, supply, rarity, owner, callData);

  await waitFor(
    assetContract
      .connect(ethers.provider.getSigner(assetBouncerAdmin))
      .mint(creator, packId, hash, supply, rarity, owner, callData)
  );
  return assetId;
}
export async function changeCatalyst(
  assetUpgraderContract: Contract,
  from: string,
  assetId: BigNumber,
  catalystId: string,
  gemsIds: string[],
  to: string
): Promise<void> {
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
): Promise<void> {
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
): Promise<void> {
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
): Promise<void> {
  const {gemMinter} = await getNamedAccounts();

  await waitFor(
    gemContract
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(beneficiary, mintingAmount)
  );
}

class GemEvent {
  gemIds: number[];
  blockHash: string;
  constructor(ids: number[], hash: string) {
    this.gemIds = ids;
    this.blockHash = hash;
  }
}

async function getGemEvent(ids: number[], hash: string): Promise<GemEvent> {
  return new GemEvent(ids, hash);
}

async function findFilteredGemEvents(
  blockHash: string,
  id: BigNumber,
  registry: Contract
): Promise<Event[]> {
  const filter = registry.filters.GemsAdded(id);
  const events = await registry.queryFilter(filter, blockHash);
  return events;
}

interface AttributesObj {
  assetId: BigNumber;
  gemEvents: GemEvent[];
}

export async function prepareGemEventData(
  registry: Contract,
  mintReceipt: Receipt,
  upgradeReceipt?: Receipt
): Promise<AttributesObj> {
  const catalystAppliedEvents = await findEvents(
    registry,
    'CatalystApplied',
    mintReceipt.blockHash
  );
  let assetId;
  let initialGemEvent: GemEvent;
  const gemEvents: GemEvent[] = [];

  if (catalystAppliedEvents[0].args) {
    assetId = catalystAppliedEvents[0].args[0];
    initialGemEvent = await getGemEvent(
      catalystAppliedEvents[0].args[2],
      mintReceipt.blockHash
    );
    gemEvents.push(initialGemEvent);
  }

  if (upgradeReceipt) {
    const gemsAddedEvents = await findFilteredGemEvents(
      upgradeReceipt.blockHash,
      assetId,
      registry
    );
    for (const event of gemsAddedEvents) {
      if (event.args) {
        const gemEvent = await getGemEvent(
          event.args[1],
          upgradeReceipt.blockHash
        );
        gemEvents.push(gemEvent);
      }
    }
  }
  return {assetId, gemEvents};
}
