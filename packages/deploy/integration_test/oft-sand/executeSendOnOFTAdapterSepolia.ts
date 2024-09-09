import 'dotenv/config';
import {ethers} from 'ethers';
import hre from 'hardhat';

// Sand token are send from OFTAdapter on Ethereum to OFTSand on Base
async function main() {
  const networkName = hre.network.name;
  if (networkName == 'hardhat') {
    throw new TypeError('Invalid network');
  }

  const EidBaseSepolia = process.env.EID_BASESEPOLIA;
  const APIKeySepolia = process.env.ETHERSCAN_API_KEY_SEPOLIA;
  const AlchemyProviderSepolia = new ethers.AlchemyProvider(
    'sepolia',
    APIKeySepolia
  );

  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {oftSender} = await getNamedAccounts();

  const Sand = await deployments.get('Sand');
  const SandAddress = Sand.address;
  const SandContract = new ethers.Contract(
    SandAddress,
    Sand.abi,
    AlchemyProviderSepolia
  );

  const OFTAdapterForSand = await deployments.get('OFTAdapterForSand');
  const OFTAdapterForSandAddress = OFTAdapterForSand.address;
  const OFTAdapterForSandContract = new ethers.Contract(
    OFTAdapterForSandAddress,
    OFTAdapterForSand.abi,
    AlchemyProviderSepolia
  );

  const decimalConversionRate =
    await OFTAdapterForSandContract.decimalConversionRate();

  const tokenToSend = decimalConversionRate * 10n;
  console.log('tokenToSend : ', tokenToSend);

  const balanceInitially = await SandContract.balanceOf(oftSender);
  console.log('balance of oftSender on Sand initially : ', balanceInitially);

  await execute(
    'Sand',
    {from: oftSender, log: true},
    'approve',
    OFTAdapterForSandAddress,
    tokenToSend
  );

  console.log(
    'OFTAdapter allowance for Sand token : ',
    await SandContract.allowance(oftSender, OFTAdapterForSandAddress)
  );

  const sendParam = [
    EidBaseSepolia,
    ethers.zeroPadValue(oftSender, 32),
    tokenToSend,
    tokenToSend,
    '0x00030100110100000000000000000000000000030d40',
    '0x',
    '0x',
  ];
  const [nativeFee] = await OFTAdapterForSandContract.quoteSend(sendParam, 0);

  await execute(
    'OFTAdapterForSand',
    {from: oftSender, log: true, value: nativeFee},
    'send',
    sendParam,
    [nativeFee, 0],
    oftSender
  );

  console.log(
    'Balance of oftSender on Sand after send: ',
    await SandContract.balanceOf(oftSender)
  );
}

void main();
