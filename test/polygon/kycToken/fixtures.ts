import {withSnapshot, setupUser} from '../../utils';
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {constants, Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

export const setupTestPolygonKYCToken = withSnapshot(
  ['TRUSTED_FORWARDER_V2', 'PolygonAuthValidator'],
  async function (hre) {
    const {deployer, upgradeAdmin} = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();
    const testURI = 'testURI/';

    const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER_V2');
    const authValidator = await ethers.getContract('PolygonAuthValidator');

    const sandAdmin = unnamedAccounts[0];
    const kycAdmin = unnamedAccounts[1];

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
            sandAdmin,
            kycAdmin,
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
      sandAdmin
    );

    // KYC_ROLE
    const contractAsKycRole = await ethers.getContract(
      'TestPolygonKYCERC721',
      kycAdmin
    );

    const other = await setupUser(unnamedAccounts[2], {
      PolygonKYCToken,
    });

    const otherB = await setupUser(unnamedAccounts[3], {
      PolygonKYCToken,
    });

    const zeroAddress = constants.AddressZero;

    const backendAuthWallet = new ethers.Wallet(
      '0x4242424242424242424242424242424242424242424242424242424242424242'
    );

    const KYC_TYPEHASH = ethers.utils.solidityKeccak256(
      ['string'],
      ['KYC(address to)']
    );

    return {
      PolygonKYCToken,
      contractAsDefaultAdmin,
      contractAsKycRole,
      sandAdmin,
      kycAdmin,
      defaultAdminRole,
      kycRole,
      other,
      otherB,
      testURI,
      hre,
      zeroAddress,
      backendAuthWallet,
      KYC_TYPEHASH,
    };
  }
);
