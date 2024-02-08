import {getContract, withSnapshot} from '../../utils/testUtils';

export const setupMainNetTest = withSnapshot(['Land_deploy'], async (hre) => {
  const namedAccount = await hre.getNamedAccounts();
  const contract = await getContract(hre, 'Land');
  const sand = await getContract(hre, 'Sand');
  return {
    contract,
    sand,
    namedAccount,
  };
});

export const setupMainNetV1Test = withSnapshot(
  ['Land_upgrade_1'],
  async (hre) => {
    const namedAccount = await hre.getNamedAccounts();
    const contract = await getContract(hre, 'Land');
    const sand = await getContract(hre, 'Sand');
    return {
      contract,
      sand,
      namedAccount,
    };
  }
);

export const setupPolygonTest = withSnapshot(['Land_deploy'], async (hre) => {
  const namedAccount = await hre.getNamedAccounts();
  const contract = await getContract(hre, 'PolygonLand');
  const trustedForwarder = await getContract(hre, 'TRUSTED_FORWARDER_V2');
  return {
    contract,
    trustedForwarder,
    namedAccount,
  };
});

export const setupPolygonV1Test = withSnapshot(
  ['Land_upgrade_1'],
  async (hre) => {
    const namedAccount = await hre.getNamedAccounts();
    const contract = await getContract(hre, 'PolygonLand');
    const trustedForwarder = await getContract(hre, 'TRUSTED_FORWARDER_V2');
    return {
      contract,
      trustedForwarder,
      namedAccount,
    };
  }
);
