import {Contract, Signer} from 'ethers';
import {
  getCompanionContract,
  getContractFromDeployment,
  ICompanionNetwork,
} from '../../utils/companionNetwork';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

export function isMumbai(): boolean {
  return hre.network.name === 'mumbai' || process.env.HARDHAT_FORK === 'mumbai';
}

export function ifNotMumbaiThrow(): void {
  if (!isMumbai()) {
    throw new Error(
      `This script must be run on mumbai, invalid network ${hre.network.name}`
    );
  }
}

export async function getCheckPointManager(
  net: ICompanionNetwork,
  address: string,
  signer?: string | Signer
): Promise<Contract> {
  return await getCompanionContract(
    net,
    address,
    [
      {
        constant: true,
        inputs: [],
        name: 'getLastChildBlock',
        outputs: [{type: 'uint256'}],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
      {
        constant: true,
        inputs: [],
        name: 'currentHeaderBlock',
        outputs: [{name: '', type: 'uint256'}],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
      {
        constant: true,
        inputs: [{name: '', type: 'uint256'}],
        name: 'headerBlocks',
        outputs: [
          {name: 'root', type: 'bytes32'},
          {name: 'start', type: 'uint256'},
          {name: 'end', type: 'uint256'},
          {name: 'createdAt', type: 'uint256'},
          {name: 'proposer', type: 'address'},
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
    signer
  );
}

export async function getRootChainManager(
  net: ICompanionNetwork,
  address: string,
  signer?: string | Signer
): Promise<Contract> {
  return await getCompanionContract(
    net,
    address,
    [
      {
        inputs: [],
        name: 'checkpointManagerAddress',
        outputs: [{type: 'address'}],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{name: 'inputData', type: 'bytes'}],
        name: 'exit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {name: 'user', type: 'address'},
          {name: 'rootToken', type: 'address'},
          {name: 'depositData', type: 'bytes'},
        ],
        name: 'depositFor',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    signer
  );
}

export async function getMaticRootContracts(
  hre: HardhatRuntimeEnvironment,
  signer?: string | Signer
): Promise<{
  rootChainManager: Contract;
  checkPointManager: Contract;
  predicateContract: Contract;
}> {
  const net = hre.companionNetworks['l1'];
  // This is a shortcut to avoid fixing the rootChainManager address in deployments
  const predicateContract = await getContractFromDeployment(
    net,
    'MINTABLE_ERC721_PREDICATE',
    signer
  );
  const MANAGER_ROLE = await predicateContract.MANAGER_ROLE();
  const rootChainManagerAddr = await predicateContract.getRoleMember(
    MANAGER_ROLE,
    0
  );
  const rootChainManager = await getRootChainManager(
    net,
    rootChainManagerAddr,
    signer
  );
  const checkPointManagerAddress = await rootChainManager.checkpointManagerAddress();
  return {
    rootChainManager,
    checkPointManager: await getCheckPointManager(
      net,
      checkPointManagerAddress,
      signer
    ),
    predicateContract,
  };
}
