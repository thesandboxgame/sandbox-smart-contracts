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
  return tokenIds.map((tokenId) => ({
    tokenId,
    isPremium: Math.random() < 0.5,
    neighborhoodId: BigInt(Math.floor(Math.random() * 128)),
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
  metadata: bigint,
  batchData: Metadata[],
): bigint {
  for (const m of batchData) {
    const bits = (m.tokenId % 32n) * 8n;
    const mask = ~(0xffn << bits);
    metadata =
      (metadata & mask) |
      ((m.neighborhoodId | (m.isPremium ? 0x80n : 0n)) << bits);
  }
  return metadata;
}

export async function updateMetadata(
  registryAsAdmin: Contract,
  metadata: Metadata[],
): Promise<void> {
  const batchData = {};
  for (const m of metadata) {
    const baseTokenId = 32n * (m.tokenId / 32n);
    if (!batchData[baseTokenId]) {
      batchData[baseTokenId] = [];
    }
    batchData[baseTokenId].push(m);
  }
  const batchBaseTokenIds = Object.keys(batchData);
  const numBatchesPerTx = 408 * 2; // 19.7Mgas (max is 1223, 29530015n gas)
  for (let i = 0; i < batchBaseTokenIds.length; i += numBatchesPerTx) {
    const tokenIds = batchBaseTokenIds.slice(i, i + numBatchesPerTx);
    // get the old data from the contract, we can use zero[] if it is the first time or we don't care about the old data
    const oldData = await registryAsAdmin.batchGetMetadata(tokenIds);
    const newData = [];
    for (const [baseTokenId, metadataWord]: [bigint, bigint] of oldData) {
      newData.push({
        baseTokenId,
        metadata: updateMetadataWord(metadataWord, batchData[baseTokenId]),
      });
    }
    // update the metadata in the contract
    await registryAsAdmin.batchSetMetadata(newData);
  }
}
