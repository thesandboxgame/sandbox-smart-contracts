import hre, {ethers} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {BigNumber} from 'ethers';
import {getMaticRootContracts, ifNotMumbaiThrow} from '../utils/matic';
import {getContractFromDeployment} from '../../utils/companionNetwork';
import {defaultAbiCoder} from 'ethers/lib/utils';

async function main() {
  ifNotMumbaiThrow();

  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addArgument(['token'], {help: 'token id'});
  parser.addFlag(['-a', '--approve'], {help: 'call approve'});
  const processArgs = parser.parseArgs();
  const tokenId = BigNumber.from(processArgs.token);
  const wallet = new ethers.Wallet(pk);
  const {rootChainManager, predicateContract} = await getMaticRootContracts(
    hre,
    wallet
  );
  const goerliAvatar = await getContractFromDeployment(
    hre.companionNetworks['l1'],
    'Avatar',
    wallet
  );

  if (processArgs.approve) {
    console.log('Calling approve');
    const approveTx = await goerliAvatar.approve(
      predicateContract.address,
      tokenId
    );
    const approveTxResult = await approveTx.wait();
    console.log('approveTxResult', approveTxResult);
  }
  console.log('Calling depositFor');
  const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
  const depositForTx = await rootChainManager.depositFor(
    wallet.address,
    goerliAvatar.address,
    depositData
  );
  const depositForResult = await depositForTx.wait();
  console.log('depositForResult', depositForResult);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
