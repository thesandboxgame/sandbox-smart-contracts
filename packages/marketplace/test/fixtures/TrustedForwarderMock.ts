import {ethers} from 'hardhat';

export async function TrustedForwarderSetup() {
  const TrustedForwarderFactory = await ethers.getContractFactory(
    'TrustedForwarderMock'
  );
  const TrustedForwarder = await TrustedForwarderFactory.deploy();

  return {TrustedForwarder};
}
