import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {setupUser, setupUsers, withSnapshot} from '../../utils';
import {Contract} from 'ethers';
import {erc20BasicApproveExtensionFixtures} from '../../common/fixtures/erc20BasicApproveExtension';

export const setupMainnetSand = withSnapshot(
  ['Land', 'Sand', 'LandPreSale_5', 'ERC20_PREDICATE'],
  erc20BasicApproveExtensionFixtures
);

type User = {address: string; sand: Contract; trustedForwarder: Contract};
export type Fixtures = {
  sand: Contract;
  users: User[];
  sandBeneficiary: User;
  deployer: User;
  childChainManager: Contract;
  trustedForwarder: Contract;
  mockERC20BasicApprovalTarget: Contract;
};
export const setupPolygonSand = withSnapshot(['PolygonSand'], async () => {
  const sand = await ethers.getContract('PolygonSand');
  const accounts = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER');
  const users = await setupUsers(unnamedAccounts, {
    sand,
    trustedForwarder,
  });
  const sandBeneficiary = await setupUser(accounts.sandBeneficiary, {
    sand,
    trustedForwarder,
  });
  const deployer = await setupUser(accounts.deployer, {
    sand,
    trustedForwarder,
  });
  await deployments.deploy('MockERC20BasicApprovalTarget', {
    from: accounts.deployer,
    args: [],
  });
  const mockERC20BasicApprovalTarget: Contract = await ethers.getContract(
    'MockERC20BasicApprovalTarget'
  );
  return {
    sand,
    users,
    sandBeneficiary,
    deployer,
    childChainManager,
    trustedForwarder,
    mockERC20BasicApprovalTarget,
  };
});
