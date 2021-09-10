import {ethers} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {BigNumber} from 'ethers';
import {ifNotMumbaiThrow} from '../utils/matic';

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
  const processArgs = parser.parseArgs();

  const wallet = new ethers.Wallet(pk, ethers.provider);
  const tokenId = BigNumber.from(processArgs.token);

  const avatarContract = await ethers.getContract('PolygonAvatar', wallet);
  console.log('calling withdraw');
  const withdrawTx = await avatarContract.withdraw(tokenId);
  const withdrawTxResult = await withdrawTx.wait();
  console.log('withdraw result', withdrawTxResult);
  console.log('TRANSACTION HASH, USE IT TO CALL callExitInL1', withdrawTx.hash);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
