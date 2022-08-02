import {getUnnamedAccounts} from 'hardhat';
import {
  getContractFromDeployment,
  ICompanionNetwork,
} from '../../../utils/companionNetwork';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getAssetERC721Contracts = async (
  l1: ICompanionNetwork,
  l2: ICompanionNetwork
) => {
  const others = await getUnnamedAccounts();
  const l1Accounts = await l1.getNamedAccounts();
  const l2Accounts = await l2.getNamedAccounts();
  return {
    l1Net: l1,
    l2Net: l2,
    others,
    l1: {
      ...l1Accounts,
      assetERC721: await getContractFromDeployment(
        l1,
        'AssetERC721',
        l1Accounts.deployer
      ),
      mintableERC721Predicate: await getContractFromDeployment(
        l1,
        'MINTABLE_ERC721_PREDICATE',
        l1Accounts.deployer
      ),
      trustedForwarder: await getContractFromDeployment(
        l1,
        'TRUSTED_FORWARDER'
      ),
    },
    l2: {
      ...l2Accounts,
      assetERC721: await getContractFromDeployment(
        l2,
        'PolygonAssetERC721',
        l2Accounts.deployer
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
    },
  };
};
