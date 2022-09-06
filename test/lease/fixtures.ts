import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';

export const setupLease = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [other, owner, user] = await getUnnamedAccounts();

  await deployments.deploy('ERC721Mintable', {
    from: deployer,
    args: ['SOMETOKEN', 'SOMETOKEN'],
  });
  const mintableERC721 = await ethers.getContract('ERC721Mintable', deployer);

  await deployments.deploy('LeaseImplMock', {from: deployer});
  const leaseImplMock = await ethers.getContract('LeaseImplMock', deployer);

  await deployments.deploy('Lease', {
    from: deployer,
    args: ['LeaseName', 'LeaseSym'],
  });
  const contract = await ethers.getContract('Lease', deployer);
  const contractAsOwner = await ethers.getContract('Lease', owner);
  const contractAsOther = await ethers.getContract('Lease', other);
  return {
    leaseImplMock,
    mintableERC721,
    contract,
    contractAsOwner,
    contractAsOther,
    other,
    owner,
    user,
  };
});
