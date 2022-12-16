import {ethers} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {ifNotMumbaiThrow} from '../utils/matic';
import {signTypedData_v4} from 'eth-sig-util';
import {BigNumber, Contract, Signer} from 'ethers';
import {Signature} from '@ethersproject/bytes';

const KYC_TYPEHASH = ethers.utils.solidityKeccak256(
  ['string'],
  ['KYC(address to)']
);

const userSignedKYCSignature = async function (
  contract: Contract,
  signer: Signer,
  to: string,
  privateKey?: string
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
      // KYC(address to)
      KYC: [{name: 'to', type: 'address'}],
    },
    primaryType: 'KYC',
    domain: {
      name: 'Sandbox KYC Token',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: contract.address,
    },
    message: {
      to,
    },
  } as never;

  let signature;
  if (privateKey) {
    signature = signTypedData_v4(ethers.utils.arrayify(privateKey) as Buffer, {
      data,
    });
  } else {
    signature = await ethers.provider.send('eth_signTypedData_v4', [
      await signer.getAddress(),
      data,
    ]);
  }
  return ethers.utils.splitSignature(signature);
};

const backendKYCSig = async function (
  contract: Contract,
  to: string,
  privateKey: string
): Promise<string> {
  const hashedData = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'address'],
      [KYC_TYPEHASH, to]
    )
  );

  const backendAuthWallet = new ethers.Wallet(privateKey);

  const backendSignature = await backendAuthWallet.signMessage(
    ethers.utils.arrayify(hashedData)
  );
  return backendSignature;
};

async function main() {
  ifNotMumbaiThrow();

  const backendPk = process.env.BACKEND_PK;
  if (!backendPk) {
    throw new Error(`Set the env var BACKEND_PK`);
  }
  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addArgument('to', {help: 'to'});
  const processArgs = parser.parseArgs();
  const to = processArgs.to;

  const userWallet = new ethers.Wallet(pk);

  const kycContractAsUser = await ethers.getContract(
    'PolygonKYCERC721',
    userWallet.address
  );
  const kycContract = await ethers.getContract('PolygonKYCERC721');
  console.log('KYC contract', kycContractAsUser.address);
  console.log('User wallet address', userWallet.address);
  console.log('wallet receiving token - should be the same as user wallet', to);

  const userSig = await userSignedKYCSignature(kycContract, userWallet, to, pk);
  const backendSig = await backendKYCSig(kycContract, to, backendPk);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any = {to, userSig, backendSig};

  console.log('Calling claim');
  const executeTx = await kycContractAsUser.claimKYCToken(...args);
  const executeTxResult = await executeTx.wait();
  console.log('Claim result', executeTxResult);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
