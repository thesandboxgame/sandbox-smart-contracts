import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {signerSetup} from './signerFixtures';
import {ethers, upgrades} from 'hardhat';

export async function royaltyRegistrySetup() {
  const {user} = await loadFixture(signerSetup);

  const RoyaltiesRegistryFactory = await ethers.getContractFactory(
    'RoyaltiesRegistry'
  );
  const RoyaltiesRegistryAsDeployer = await upgrades.deployProxy(
    RoyaltiesRegistryFactory,
    [],
    {
      initializer: '__RoyaltiesRegistry_init',
    }
  );

  const RoyaltiesRegistryAsUser = await RoyaltiesRegistryAsDeployer.connect(
    user
  );

  const Royalties2981ImplMock = await ethers.getContractFactory(
    'Royalties2981ImplMock'
  );

  return {
    RoyaltiesRegistryAsDeployer,
    RoyaltiesRegistryAsUser,
    Royalties2981ImplMock,
  };
}
