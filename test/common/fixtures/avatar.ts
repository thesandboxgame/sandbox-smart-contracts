import {ethers, getUnnamedAccounts} from 'hardhat';
import {
  getContractFromDeployment,
  ICompanionNetwork,
} from '../../../utils/companionNetwork';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getAvatarContracts = async (
  l1: ICompanionNetwork,
  l2: ICompanionNetwork
) => {
  const [buyer] = await getUnnamedAccounts();
  const l1Accounts = await l1.getNamedAccounts();
  const l2Accounts = await l2.getNamedAccounts();
  return {
    l1Net: l1,
    l2Net: l2,
    buyer,
    l1: {
      ...l1Accounts,
      avatar: await getContractFromDeployment(
        l1,
        'Avatar',
        l1Accounts.deployer
      ),
      avatarTunnel: await getContractFromDeployment(
        l1,
        'AvatarTunnel',
        l1Accounts.deployer
      ),
      trustedForwarder: await getContractFromDeployment(
        l1,
        'TRUSTED_FORWARDER'
      ),
      fxRoot: await getContractFromDeployment(l1, 'FXROOT'),
      checkPointManager: await getContractFromDeployment(
        l1,
        'CHECKPOINTMANAGER',
        l1Accounts.deployer
      ),
    },
    l2: {
      ...l2Accounts,
      avatar: await getContractFromDeployment(
        l2,
        'PolygonAvatar',
        l2Accounts.deployer
      ),
      avatarTunnel: await getContractFromDeployment(
        l2,
        'PolygonAvatarTunnel',
        l2Accounts.deployer
      ),
      sale: await getContractFromDeployment(
        l2,
        'PolygonAvatarSale',
        l2Accounts.deployer
      ),
      // TODO: This makes sense ?
      backendAuthEtherWallet: new ethers.Wallet(
        '0x4242424242424242424242424242424242424242424242424242424242424242'
      ),
      trustedForwarder: await getContractFromDeployment(
        l2,
        'TRUSTED_FORWARDER'
      ),
      childChainManager: await getContractFromDeployment(
        l2,
        'CHILD_CHAIN_MANAGER',
        l2Accounts.deployer
      ),
      fxChild: await getContractFromDeployment(
        l2,
        'FXCHILD',
        l2Accounts.deployer
      ),
    },
  };
};
