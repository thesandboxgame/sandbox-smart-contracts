import {ethers} from 'hardhat';

export async function setupLandShadow() {
  const [
    deployer,
    user1,
    user2,
    user3,
  ] = await ethers.getSigners();

  // Deploy mock ERC721 contracts for root and child LAND
  const MockERC721Factory = await ethers.getContractFactory('MockERC721');
  const rootLAND = await MockERC721Factory.deploy('Root LAND', 'rLAND');
  const childLAND = await MockERC721Factory.deploy('Child LAND', 'cLAND');

  // Deploy mock endpoint for LayerZero
  const EndpointMockFactory = await ethers.getContractFactory('EndpointMock');
  const endpoint = await EndpointMockFactory.deploy(1); // eid = 1

  // LayerZero read channel ID for testing
  const readChannel = 1002; // Standard read channel ID

  // Chain IDs for testing (using test network IDs)
  const rootChainId = 1; // Ethereum mainnet (or testnet)
  const childChainId = 137; // Polygon mainnet (or testnet)

  // Deploy ShadowLAND contract
  const ShadowLANDFactory = await ethers.getContractFactory('ShadowLAND');
  const ShadowLAND = await ShadowLANDFactory.deploy(
    await endpoint.getAddress(),
    await rootLAND.getAddress(),
    await childLAND.getAddress(),
    readChannel,
    rootChainId,
    childChainId
  );

  return {
    ShadowLAND,
    rootLAND,
    childLAND,
    endpoint,
    readChannel,
    rootChainId,
    childChainId,
    deployer,
    user1,
    user2,
    user3,
  };
}
