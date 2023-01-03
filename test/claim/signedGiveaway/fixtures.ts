import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import ERC20Mock from '@openzeppelin/contracts-0.8/build/contracts/ERC20PresetMinterPauser.json';
import {withSnapshot} from '../../utils';
import {BigNumberish} from 'ethers';

export const setupSignedGiveway = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('SandMock', {
    from: deployer,
    contract: ERC20Mock,
    args: ['AToken', 'SAND'],
    proxy: false,
  });
  const sandToken = await ethers.getContract('SandMock', deployer);
  await deployments.deploy('SignedGiveaway', {
    from: deployer,
    contract: 'SignedERC20Giveaway',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [trustedForwarder, adminRole],
      },
    },
  });
  const contract = await ethers.getContract('SignedGiveaway', other);
  const contractAsAdmin = await ethers.getContract('SignedGiveaway', adminRole);
  // Grant roles.
  const signerRole = await contractAsAdmin.SIGNER_ROLE();
  await contractAsAdmin.grantRole(signerRole, signer);
  return {
    mint: async (amount: BigNumberish) => {
      await sandToken.mint(contract.address, amount);
    },
    contract,
    contractAsAdmin,
    sandToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  };
});
