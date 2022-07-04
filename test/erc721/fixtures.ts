import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';

export const setupBaseERC721Upgradeable = withSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  const [other, trustedForwarder, admin] = await getUnnamedAccounts();
  const name = 'TestBaseERC721Upgradeable';
  const symbol = 'TEB';
  await deployments.deploy(name, {
    from: deployer,
    args: [trustedForwarder, admin, name, symbol],
  });
  const contractAsDeployer = await ethers.getContract(name, deployer);
  const contractAsOther = await ethers.getContract(name, other);
  return {
    other,
    trustedForwarder,
    admin,
    contractAsDeployer,
    contractAsOther,
    name,
    symbol,
  };
});
