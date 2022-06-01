import {HardhatRuntimeEnvironment} from 'hardhat/types';

const versionsToContractName: {[version: string]: string} = {
  V1: 'TRUSTED_FORWARDER',
  V2: 'TRUSTED_FORWARDER_V2',
};

export default async function (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  admin: string,
  version = 'V2'
): Promise<void> {
  if (!versionsToContractName[version])
    throw new Error('Unknown version: ' + version);
  const trustedForwarderName = versionsToContractName[version];
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const TRUSTED_FORWARDER = await deployments.get(trustedForwarderName);
  const isTrustedForwarder = await read(
    contractName,
    'isTrustedForwarder',
    TRUSTED_FORWARDER.address
  );
  if (!isTrustedForwarder) {
    console.log(
      `Setting ${trustedForwarderName} as trusted forwarder for ${contractName}`
    );
    await catchUnknownSigner(
      execute(
        contractName,
        {from: admin, log: true},
        'setTrustedForwarder',
        TRUSTED_FORWARDER.address
      )
    );
  }
}
