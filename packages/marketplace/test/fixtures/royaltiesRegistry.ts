import {ethers, upgrades} from 'hardhat';
import {signerSetup} from './signers';

export async function royaltiesRegistrySetup() {
  const {user} = await signerSetup();

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
