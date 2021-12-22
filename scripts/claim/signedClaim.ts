import {BigNumber} from 'ethers';
import {toWei} from '../../test/utils';
import {ethers} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {ifNotMumbaiThrow} from '../utils/matic';
import {signedGiveawaySignature} from '../../test/claim/signedGiveaway/signature';
import {formatUnits} from 'ethers/lib/utils';

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
  parser.addArgument('claimId', {help: 'claim id'});
  parser.addArgument(['-a', '--amount'], {
    help: 'amount',
    defaultValue: '0.01',
  });
  parser.addFlag(['-d', '--dryrun'], {help: 'dry run'});
  const processArgs = parser.parseArgs();

  const backendAuthEtherWallet = new ethers.Wallet(backendPk);
  const wallet = new ethers.Wallet(pk, ethers.provider);
  const claimId = BigNumber.from(processArgs.claimId);
  const amount = toWei(parseFloat(processArgs.amount) * 100).div(100);

  const claimContract = await ethers.getContract('ERC20SignedClaim', wallet);
  const sandContract = await ethers.getContract('PolygonSand', wallet);
  console.log('Claim contract', claimContract.address);
  console.log('Sand contract', sandContract.address);
  console.log('claimId', claimId.toString());
  console.log('beneficiary', wallet.address);
  console.log('amount', formatUnits(amount));
  const balance = BigNumber.from(
    await sandContract.balanceOf(claimContract.address)
  );
  console.log('Claim contract balance', formatUnits(balance));
  if (amount.gt(balance)) {
    throw new Error(
      `Not enough balance ${formatUnits(balance)} < ${formatUnits(amount)}`
    );
  }
  const SIGNER_ROLE = await claimContract.SIGNER_ROLE();
  const hasSignerRole = await claimContract.hasRole(
    SIGNER_ROLE,
    backendAuthEtherWallet.address
  );
  if (!hasSignerRole) {
    throw new Error(`Invalid signer ${backendAuthEtherWallet.address}`);
  }
  const {v, r, s} = await signedGiveawaySignature(
    claimContract,
    backendAuthEtherWallet.address,
    claimId,
    sandContract.address,
    wallet.address,
    amount,
    backendAuthEtherWallet.privateKey
  );
  const args = [
    v,
    r,
    s,
    backendAuthEtherWallet.address,
    claimId,
    sandContract.address,
    wallet.address,
    amount,
  ];
  if (!(await claimContract.verify(...args))) {
    throw new Error(`Message does not verify ${JSON.stringify(args, null, 4)}`);
  }
  if (processArgs.dryrun) {
    console.warn('Dry run, skip the call to claim');
  } else {
    console.log('Calling claim');
    const executeTx = await claimContract.claim(...args);
    const executeTxResult = await executeTx.wait();
    console.log('Claim result', executeTxResult);
  }
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
