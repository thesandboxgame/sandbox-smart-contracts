import {BigNumberish, Contract} from 'ethers';
import {Signature} from '@ethersproject/bytes';
import {ethers} from 'hardhat';
import {signTypedData_v4} from 'eth-sig-util';
import {Claim, getClaimEntries} from './claim';

async function getSignature(signer: string, data: never, privateKey = '') {
  let signature;
  if (privateKey) {
    signature = signTypedData_v4(ethers.utils.arrayify(privateKey) as Buffer, {
      data,
    });
  } else {
    signature = await ethers.provider.send('eth_signTypedData_v4', [
      signer,
      data,
    ]);
  }
  return ethers.utils.splitSignature(signature);
}

export const signedMultiGiveawaySignature = async function (
  contract: Contract,
  signer: string,
  claimIds: BigNumberish[],
  expiration: number,
  from: string,
  to: string,
  claims: Claim[],
  privateKey = ''
): Promise<Signature> {
  const chainId = (await contract.provider.getNetwork()).chainId;

  const data = {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      ClaimEntry: [
        {name: 'tokenType', type: 'uint256'},
        {name: 'tokenAddress', type: 'address'},
        {name: 'data', type: 'bytes'},
      ],
      Claim: [
        {name: 'claimIds', type: 'uint256[]'},
        {name: 'expiration', type: 'uint256'},
        {name: 'from', type: 'address'},
        {name: 'to', type: 'address'},
        {name: 'claims', type: 'ClaimEntry[]'},
      ],
    },
    primaryType: 'Claim',
    domain: {
      name: 'Sandbox SignedMultiGiveaway',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: contract.address,
    },
    message: {
      claimIds: claimIds.map((x) => x.toString()),
      expiration,
      from,
      to,
      claims: getClaimEntries(claims),
    },
  } as never;
  return getSignature(signer, data, privateKey);
};

export const signedClaimSignature = async function (
  contract: Contract,
  signer: string,
  claimIds: BigNumberish[],
  expiration: number,
  to: string,
  callData: string,
  privateKey = ''
): Promise<Signature> {
  const chainId = (await contract.provider.getNetwork()).chainId;
  const data = {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      Claim: [
        {name: 'claimIds', type: 'uint256[]'},
        {name: 'expiration', type: 'uint256'},
        {name: 'to', type: 'address'},
        {name: 'data', type: 'bytes'},
      ],
    },
    primaryType: 'Claim',
    domain: {
      name: 'Sandbox SignedCaller',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: contract.address,
    },
    message: {
      claimIds: claimIds.map((x) => x.toString()),
      expiration,
      to,
      data: callData,
    },
  } as never;
  return getSignature(signer, data, privateKey);
};
