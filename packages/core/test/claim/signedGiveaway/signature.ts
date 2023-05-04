import {BigNumber, BigNumberish, Contract} from 'ethers';
import {Signature} from '@ethersproject/bytes';
import {ethers} from 'hardhat';
import {signTypedData_v4} from 'eth-sig-util';

export const signedGiveawaySignature = async function (
  contract: Contract,
  signer: string,
  claimId: BigNumberish,
  token: string,
  to: string,
  amount: BigNumberish,
  privateKey = ''
): Promise<Signature> {
  const chainId = BigNumber.from(await contract.getChainId());
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
      // Claim(address signer,uint256 claimId,address token,address to,uint256 amount)
      Claim: [
        {name: 'signer', type: 'address'},
        {name: 'claimId', type: 'uint256'},
        {name: 'token', type: 'address'},
        {name: 'to', type: 'address'},
        {name: 'amount', type: 'uint256'},
      ],
    },
    primaryType: 'Claim',
    domain: {
      name: 'Sandbox SignedERC20Giveaway',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: contract.address,
    },
    message: {
      signer,
      claimId: claimId.toString(),
      token,
      to,
      amount: amount.toString(),
    },
  } as never;

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
};
