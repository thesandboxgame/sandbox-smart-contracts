import {ethers} from 'hardhat';
import {deployWithProxy} from '../fixtures';

export async function setupRegistry() {
  const [deployer, admin, other] = await ethers.getSigners();
  const [registryAsDeployer, registryAsAdmin, registryAsOther] =
    await deployWithProxy('LandMetadataRegistryMock', [deployer, admin, other]);
  await registryAsDeployer.initialize(admin);

  return {
    deployer,
    other,
    admin,
    registryAsDeployer,
    registryAsOther,
    registryAsAdmin,
  };
}
