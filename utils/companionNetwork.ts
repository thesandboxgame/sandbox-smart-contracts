import {DeploymentsExtension} from 'hardhat-deploy/dist/types';
import {EthereumProvider} from 'hardhat/types';
import {EIP1193Provider} from 'hardhat/src/types/provider';
import {ethers} from 'hardhat';
import {Contract, Signer} from 'ethers';
import {ABI, Address} from 'hardhat-deploy/types';
import {JsonRpcProvider} from '@ethersproject/providers/lib/json-rpc-provider';

export type ICompanionNetwork = {
  deployments: DeploymentsExtension;
  getNamedAccounts: () => Promise<{
    [name: string]: Address;
  }>;
  getUnnamedAccounts: () => Promise<string[]>;
  getChainId(): Promise<string>;
  provider?: EthereumProvider;
};

export function getProvider(net: ICompanionNetwork): JsonRpcProvider {
  if (net.provider) {
    return new ethers.providers.Web3Provider(net.provider as EIP1193Provider);
  }
  return ethers.provider;
}

export async function getSigner(
  net: ICompanionNetwork,
  signer: string | Signer
): Promise<Signer> {
  // TODO: Maybe we can avoid this case.
  if (!net.provider && typeof signer == 'string') {
    return await ethers.getSigner(signer);
  }
  const p = getProvider(net);
  if (typeof signer == 'string') {
    return p.getSigner(signer);
  }
  return signer.connect(p);
}

export async function getCompanionContract(
  net: ICompanionNetwork,
  address: string,
  abi: ABI,
  signer?: string | Signer
): Promise<Contract> {
  if (signer) {
    return new Contract(address, abi, await getSigner(net, signer));
  }
  return new Contract(address, abi, getProvider(net));
}

export async function getContractFromDeployment(
  net: ICompanionNetwork,
  name: string,
  signer?: string | Signer
): Promise<Contract> {
  const d = await net.deployments.get(name);
  return await getCompanionContract(net, d.address, d.abi, signer);
}
