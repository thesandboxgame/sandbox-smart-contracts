import {withSnapshot, setupUser} from '../../utils';
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

export const setupTestPolygonKYCToken = withSnapshot(
  ['TRUSTED_FORWARDER_V2', 'PolygonAuthValidator'],
  async function () {
    const {deployer, upgradeAdmin} = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();
    const testURI = 'testURI/';

    const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER_V2');
    const authValidator = await ethers.getContract('PolygonAuthValidator');

    // Deploy test version of contract
    await deployments.deploy('TestPolygonKYCERC721', {
      from: deployer,
      contract: 'KYCERC721',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          // sandAdmin, kycAdmin, trustedForwarder, authValidator, baseUri
          args: [
            unnamedAccounts[0],
            unnamedAccounts[1],
            trustedForwarder.address,
            authValidator.address,
            testURI,
          ],
        },
      },
    });

    const PolygonKYCToken = await ethers.getContract('TestPolygonKYCERC721');

    // ROLES
    const defaultAdminRole = await PolygonKYCToken.DEFAULT_ADMIN_ROLE();
    const kycRole = await PolygonKYCToken.KYC_ROLE();

    // DEFAULT_ADMIN_ROLE
    const contractAsDefaultAdmin = await ethers.getContract(
      'TestPolygonKYCERC721',
      unnamedAccounts[0]
    );

    // KYC_ROLE
    const contractAsKycRole = await ethers.getContract(
      'TestPolygonKYCERC721',
      unnamedAccounts[1]
    );

    const other = await setupUser(unnamedAccounts[2], {
      PolygonKYCToken,
    });

    const otherB = await setupUser(unnamedAccounts[3], {
      PolygonKYCToken,
    });

    return {
      PolygonKYCToken,
      contractAsDefaultAdmin,
      contractAsKycRole,
      kycAdmin: unnamedAccounts[0],
      defaultAdminRole,
      kycRole,
      other,
      otherB,
      testURI,
    };
  }
);
