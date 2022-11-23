import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {withSnapshot, setupUser} from '../../utils';

export const setupPolygonKYCToken = withSnapshot(
  ['PolygonKYCERC721'],
  async function (hre) {
    const {kycAdmin, backendKYCWallet} = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();
    const PolygonKYCToken = await ethers.getContract('PolygonKYCERC721');

    // ROLES
    const defaultAdminRole = await PolygonKYCToken.DEFAULT_ADMIN_ROLE();
    const minterRole = await PolygonKYCToken.MINTER_ROLE();
    const burnerRole = await PolygonKYCToken.BURNER_ROLE();

    // DEFAULT_ADMIN_ROLE
    const contractAsDefaultAdmin = await ethers.getContract(
      'PolygonKYCERC721',
      kycAdmin
    );

    // MINTER_ROLE
    const contractAsMinterRole = await ethers.getContract(
      'PolygonKYCERC721',
      backendKYCWallet
    );

    // BURNER_ROLE
    const contractAsBurnerRole = contractAsDefaultAdmin;

    const other = await setupUser(unnamedAccounts[0], {
      PolygonKYCToken,
    });

    return {
      PolygonKYCToken,
      contractAsDefaultAdmin,
      contractAsMinterRole,
      contractAsBurnerRole,
      kycAdmin,
      backendKYCWallet,
      defaultAdminRole,
      minterRole,
      burnerRole,
      other,
      hre,
    };
  }
);
