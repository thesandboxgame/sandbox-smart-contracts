import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';

export const setupBaseERC721Upgradeable = withSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  const [
    other,
    trustedForwarder,
    defaultAdmin,
    admin,
  ] = await getUnnamedAccounts();
  const name = 'TestBaseERC721Upgradeable';
  const symbol = 'TEB';
  await deployments.deploy(name, {
    from: deployer,
    args: [trustedForwarder, defaultAdmin, name, symbol],
  });
  const contract = await ethers.getContract(name, deployer);
  const contractAsOther = await ethers.getContract(name, other);
  const contractAsDefaultAdmin = await ethers.getContract(name, defaultAdmin);
  const ADMIN_ROLE = await contractAsDefaultAdmin.ADMIN_ROLE();
  await contractAsDefaultAdmin.grantRole(ADMIN_ROLE, admin);
  const contractAsAdmin = await ethers.getContract(name, admin);
  const contractAsTrustedForwarder = await ethers.getContract(
    name,
    trustedForwarder
  );
  return {
    ADMIN_ROLE,
    other,
    trustedForwarder,
    defaultAdmin,
    admin,
    contract,
    contractAsOther,
    contractAsDefaultAdmin,
    contractAsTrustedForwarder,
    contractAsAdmin,
    name,
    symbol,
  };
});
