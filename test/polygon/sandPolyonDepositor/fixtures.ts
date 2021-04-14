import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';

export const setupSandPolygonDepositor = deployments.createFixture(async () => {
  await deployments.fixture();
  const sandContract: Contract = await ethers.getContract('Sand');
  const users = await getUnnamedAccounts();
  const {
    catalystMinter,
    gemMinter,
    gemsCatalystsRegistryAdmin,
  } = await getNamedAccounts();

  await deployments.deploy(`MockRootChainManager`, {
    contract: 'MockRootChainManager',
    from: catalystMinter,
    log: true,
    args: [],
  });

  await deployments.deploy(`MockSandPredicate`, {
    contract: 'MockSandPredicate',
    from: catalystMinter,
    log: true,
    args: [],
  });
  const mockRootChainManager = await deployments.get('MockRootChainManager');
  const mockSandPredicate = await deployments.get('MockSandPredicate');

  await deployments.deploy(`SandPolygonDepositor`, {
    contract: 'SandPolygonDepositor',
    from: catalystMinter,
    log: true,
    args: [
      sandContract.address,
      mockSandPredicate.address,
      mockRootChainManager.address,
    ],
  });

  return {};
});
