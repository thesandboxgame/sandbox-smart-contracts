import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';
import {withSnapshot} from '../utils';

const name = 'AVATARNAME';
const symbol = 'TSBAV';
const baseUri = 'http://api';
export const setupAvatarTest = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    minter,
    pauser,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('Avatar', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [name, symbol, baseUri, trustedForwarder, adminRole],
      },
    },
  });
  const avatar = await ethers.getContract('Avatar', deployer);
  return {
    baseUri,
    symbol,
    name,
    avatar,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    minter,
    pauser,
    other,
    dest,
  };
});

const addRole = async function (
  roleName: string,
  adminRole: string,
  avatar: Contract,
  addr: string
): Promise<void> {
  const avatarAsAdmin = await ethers.getContract('Avatar', adminRole);
  const role = await avatar[roleName]();
  await avatarAsAdmin.grantRole(role, addr);
};

export const addMinter = (
  adminRole: string,
  avatar: Contract,
  addr: string
): Promise<void> => addRole('MINTER_ROLE', adminRole, avatar, addr);

export const addPauser = (
  adminRole: string,
  avatar: Contract,
  addr: string
): Promise<void> => addRole('PAUSE_ROLE', adminRole, avatar, addr);
