import {withSnapshot, setupUser} from '../../utils';
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

export const setupTestPolygonKYCToken = withSnapshot([], async function () {
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const testURI = 'testURI/';

  // Deploy test version of contract
  await deployments.deploy('TestPolygonKYCERC721', {
    from: deployer,
    contract: 'KYCERC721',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [unnamedAccounts[0], unnamedAccounts[1], testURI],
      },
    },
  });

  const PolygonKYCToken = await ethers.getContract('TestPolygonKYCERC721');

  // ROLES
  const defaultAdminRole = await PolygonKYCToken.DEFAULT_ADMIN_ROLE();
  const minterRole = await PolygonKYCToken.MINTER_ROLE();
  const burnerRole = await PolygonKYCToken.BURNER_ROLE();

  // DEFAULT_ADMIN_ROLE
  const contractAsDefaultAdmin = await ethers.getContract(
    'TestPolygonKYCERC721',
    unnamedAccounts[0]
  );

  // MINTER_ROLE
  const contractAsMinterRole = await ethers.getContract(
    'TestPolygonKYCERC721',
    unnamedAccounts[1]
  );

  // BURNER_ROLE
  const contractAsBurnerRole = contractAsDefaultAdmin;

  const other = await setupUser(unnamedAccounts[2], {
    PolygonKYCToken,
  });

  const otherB = await setupUser(unnamedAccounts[3], {
    PolygonKYCToken,
  });

  return {
    PolygonKYCToken,
    contractAsDefaultAdmin,
    contractAsMinterRole,
    contractAsBurnerRole,
    kycAdmin: unnamedAccounts[0],
    backendKYCWallet: unnamedAccounts[1],
    defaultAdminRole,
    minterRole,
    burnerRole,
    other,
    otherB,
    testURI,
  };
});
