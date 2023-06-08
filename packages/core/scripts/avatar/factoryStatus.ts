import hre from 'hardhat';
const {ethers} = hre;

// run script as follows: yarn execute <network> ./scripts/avatar/factoryStatus.ts

const DEPLOYED_FACTORY_ADDRESS: {[key: string]: string} = {
  mumbai: '0x138Bb69D7c7B1A0E419DF233A41Da49518Cf5651',
};

const factoryContractName = 'CollectionFactory';
const network = hre.network.name;
const factoryAddress: string = DEPLOYED_FACTORY_ADDRESS[network];

async function main() {
  console.log(
    `Working with CollectionFactory(${factoryAddress}) deployed on ${network}`
  );

  const contract = await ethers.getContract(factoryContractName);
  const collections: string[] = await contract.getCollections();
  const factoryOwner = await contract.owner();

  const aliases: string[] = (
    await contract.getBeaconAliases()
  ).map((bytes32Value: string) =>
    ethers.utils.parseBytes32String(bytes32Value)
  );

  console.log('Factory owner:', factoryOwner);
  console.log(`Implementations (${aliases.length}):`, aliases);
  console.log(`Collections: (${collections.length}):`, collections);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
