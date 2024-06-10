import 'dotenv/config';
import {ethers} from 'ethers';
import hre from 'hardhat';

// Sand token are send from OFTSand on BSC to Sand on Sepolia
async function main() {
  const networkName = hre.network.name;
  if (networkName == 'hardhat') {
    throw new TypeError('Invalid network');
  }

  const EidSepolia = process.env.EID_SEPOLIA;
  const APIKeyBscTestnet = process.env.ETHERSCAN_API_BSCTESTNET;
  const ProviderBscTestnet = new ethers.EtherscanProvider(
    'bnbt',
    APIKeyBscTestnet
  );

  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {oftSender} = await getNamedAccounts();

  const OFTSand = await deployments.get('OFTSand');
  const OFTSandAddress = OFTSand.address;
  const OFTSandContract = new ethers.Contract(
    OFTSandAddress,
    OFTSand.abi,
    ProviderBscTestnet
  );

  const decimalConversionRate = await OFTSandContract.decimalConversionRate();

  const tokenToSend = decimalConversionRate * 10n;
  console.log('tokenToSend : ', tokenToSend);

  const balanceInitially = await OFTSandContract.balanceOf(oftSender);
  console.log(
    `balance of oftSender on OFTSand ${networkName} initially : `,
    balanceInitially
  );

  const sendParam = [
    EidSepolia,
    ethers.zeroPadValue(oftSender, 32),
    tokenToSend,
    tokenToSend,
    '0x00030100110100000000000000000000000000030d40',
    '0x',
    '0x',
  ];
  const [nativeFee] = await OFTSandContract.quoteSend(sendParam, 0);

  await execute(
    'OFTSand',
    {from: oftSender, log: true, value: nativeFee},
    'send',
    sendParam,
    [nativeFee, 0],
    oftSender
  );

  console.log(
    `Balance of oftSender on OFTSand ${networkName} after send: `,
    await OFTSandContract.balanceOf(oftSender)
  );
}

void main();
