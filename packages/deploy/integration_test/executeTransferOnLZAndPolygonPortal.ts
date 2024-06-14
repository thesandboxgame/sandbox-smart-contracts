import 'dotenv/config';
import {ethers} from 'ethers';
import hre from 'hardhat';

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
  const {sandAdmin} = await getNamedAccounts();

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

  const ERC20PridicateProxy = await deployments.get('ERC20PredicateProxy');
  const ERC20PridicateProxyAddress = ERC20PridicateProxy.address;

  const sandAdminBalancOnSandInitailly = await SandContract.balanceOf(
    sandAdmin
  );

  console.log(
    'balance of sand admin on Sand initially : ',
    sandAdminBalancOnSandInitailly
  );

  const decimalConversionRate =
    await OFTAdapterForSandContract.decimalConversionRate();

  const tokenToSendUsingLZ = decimalConversionRate * 10n;

  const tokenToSendUsingPolygonPortal = decimalConversionRate;

  console.log('token to transfer using LayerZero : ', tokenToSendUsingLZ);
  console.log(
    'token to transfer using Polygon Portal : ',
    tokenToSendUsingPolygonPortal
  );

  // Approve OFTAdapterForSand contract for Sand token
  await execute(
    'Sand',
    {from: sandAdmin, log: true},
    'approve',
    OFTAdapterForSandAddress,
    tokenToSendUsingLZ
  );

  // Approve ERC20PredicateProxy (by default spenderAddress) contract for Sand token
  await execute(
    'Sand',
    {from: sandAdmin, log: true},
    'approve',
    ERC20PridicateProxyAddress,
    tokenToSendUsingPolygonPortal
  );

  console.log(
    'OFTAdapter allowance for Sand token : ',
    await SandContract.allowance(sandAdmin, OFTAdapterForSandAddress)
  );
  console.log(
    'ERC20PredicateProxy allowance for Sand token : ',
    await SandContract.allowance(sandAdmin, ERC20PridicateProxyAddress)
  );

  const sendParam = [
    EidBaseSepolia,
    ethers.zeroPadValue(sandAdmin, 32),
    tokenToSendUsingLZ,
    tokenToSendUsingLZ,
    '0x00030100110100000000000000000000000000030d40',
    '0x',
    '0x',
  ];
  const [nativeFee] = await OFTAdapterForSandContract.quoteSend(sendParam, 0);

  //   Execute the send to transfer Sand from sepolia to baseSepolia using LayerZero
  await execute(
    'OFTAdapterForSand',
    {from: sandAdmin, log: true, value: nativeFee},
    'send',
    sendParam,
    [nativeFee, 0],
    sandAdmin
  );

  //   Move tokens from root to child chain
  await execute(
    'RootChainManagerProxy',
    {from: sandAdmin, log: true},
    'depositFor',
    sandAdmin,
    SandAddress,
    ethers.zeroPadValue(`0x${tokenToSendUsingPolygonPortal.toString(16)}`, 32)
  );

  const sandAdminFinalBalance = await SandContract.balanceOf(sandAdmin);
  const expectedFinalBalance =
    sandAdminBalancOnSandInitailly -
    tokenToSendUsingLZ -
    tokenToSendUsingPolygonPortal;

  if (sandAdminFinalBalance === expectedFinalBalance) {
    console.log('Balance verification successful.');
  } else {
    console.error('Balance verification failed.');
  }
}

void main();
