import {ethers, upgrades} from 'hardhat';
import {Contract} from 'ethers';

export async function setupRegistry() {
  const [deployer, admin, other] = await ethers.getSigners();
  const MetadataRegistryFactory = await ethers.getContractFactory(
    'LandMetadataRegistryMock',
  );
  const MetadataRegistryContract = await upgrades.deployProxy(
    MetadataRegistryFactory,
    [await admin.getAddress()],
  );
  const registryAsDeployer = MetadataRegistryContract.connect(deployer);
  const registryAsAdmin = MetadataRegistryContract.connect(admin);
  const registryAsOther = MetadataRegistryContract.connect(other);

  return {
    deployer,
    other,
    admin,
    registryAsDeployer,
    registryAsOther,
    registryAsAdmin,
  };
}

export function getRandomMetadata(tokenIds: bigint[]): Metadata[] {
  const maxId = 2 ** 15;
  return tokenIds.map((tokenId) => ({
    tokenId,
    isPremium: Math.random() < 0.5,
    neighborhoodId: BigInt(Math.floor(Math.random() * maxId)),
  }));
}

export function getRandomTokenIds(
  cant: number,
  exclude: bigint[] = [],
): bigint[] {
  const toExclude = new Set<bigint>(exclude);
  const tokenIds = new Set<bigint>();
  for (let i = 0; i < cant; ) {
    const id = BigInt(Math.floor(Math.random() * 408 * 408));
    if (tokenIds.has(id) || toExclude.has(id)) {
      continue;
    }
    tokenIds.add(id);
    i++;
  }
  return [...tokenIds];
}

export type Metadata = {
  tokenId: bigint;
  isPremium: boolean;
  neighborhoodId: bigint;
};

export function updateMetadataWord(
  LANDS_PER_WORD: bigint,
  metadata: bigint,
  batchData: Metadata[],
): bigint {
  const BITS_PER_LAND = 256n / LANDS_PER_WORD;
  const MASK = 2n ** BITS_PER_LAND - 1n;
  const PREMIUM_MASK = 1n << (BITS_PER_LAND - 1n);
  for (const m of batchData) {
    const bits = (m.tokenId % LANDS_PER_WORD) * BITS_PER_LAND;
    const mask = ~(MASK << bits);
    metadata =
      (metadata & mask) |
      ((m.neighborhoodId | (m.isPremium ? PREMIUM_MASK : 0n)) << bits);
  }
  return metadata;
}

export async function updateMetadata(
  registryAsAdmin: Contract,
  metadata: Metadata[],
): Promise<void> {
  const LANDS_PER_WORD = await registryAsAdmin.LANDS_PER_WORD();
  const batchData = {};
  for (const m of metadata) {
    const baseTokenId = LANDS_PER_WORD * (m.tokenId / LANDS_PER_WORD);
    if (!batchData[baseTokenId]) {
      batchData[baseTokenId] = [];
    }
    batchData[baseTokenId].push(m);
  }
  const batchBaseTokenIds = Object.keys(batchData);
  const numBatchesPerTx = 408 * 2;
  for (let i = 0; i < batchBaseTokenIds.length; i += numBatchesPerTx) {
    const tokenIds = batchBaseTokenIds.slice(i, i + numBatchesPerTx);
    // get the old data from the contract, we can use zero[] if it is the first time or we don't care about the old data
    const oldData = await registryAsAdmin.batchGetMetadata(tokenIds);
    const newData = [];
    for (const [baseTokenId, metadataWord]: [bigint, bigint] of oldData) {
      newData.push({
        baseTokenId,
        metadata: updateMetadataWord(
          LANDS_PER_WORD,
          metadataWord,
          batchData[baseTokenId],
        ),
      });
    }
    // update the metadata in the contract
    await registryAsAdmin.batchSetMetadata(newData);
  }
}
