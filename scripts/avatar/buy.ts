import {BigNumber} from 'ethers';
import {toWei} from '../../test/utils';
import {avatarSaleSignature} from '../../test/common/signatures';
import {ethers, getNamedAccounts} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {ifNotMumbaiThrow} from '../utils/matic';

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
  parser.addArgument(['token'], {help: 'token id'});
  parser.addArgument(['price'], {help: 'price', defaultValue: '5'});
  parser.addFlag(['-a', '--approve'], {help: 'call approve'});
  const processArgs = parser.parseArgs();

  const backendAuthEtherWallet = new ethers.Wallet(backendPk);
  const wallet = new ethers.Wallet(pk, ethers.provider);
  const tokenId = BigNumber.from(processArgs.token);
  const price = toWei(processArgs.price);
  const {sandboxAccount} = await getNamedAccounts();

  const avatarSaleContract = await ethers.getContract(
    'PolygonAvatarSale',
    wallet
  );

  const {v, r, s} = await avatarSaleSignature(
    avatarSaleContract,
    backendAuthEtherWallet.address,
    wallet.address,
    tokenId,
    sandboxAccount,
    price,
    backendAuthEtherWallet.privateKey
  );
  const args = [
    v,
    r,
    s,
    backendAuthEtherWallet.address,
    wallet.address,
    tokenId,
    sandboxAccount,
    price,
  ];

  const SIGNER_ROLE = await avatarSaleContract.SIGNER_ROLE();
  const hasSignerRole = await avatarSaleContract.hasRole(
    SIGNER_ROLE,
    backendAuthEtherWallet.address
  );
  if (!hasSignerRole) {
    throw new Error(`Invalid signer ${backendAuthEtherWallet.address}`);
  }

  const SELLER_ROLE = await avatarSaleContract.SELLER_ROLE();
  const hasSellerRole = await avatarSaleContract.hasRole(
    SELLER_ROLE,
    sandboxAccount
  );
  if (!hasSellerRole) {
    throw new Error(`Invalid seller ${sandboxAccount}`);
  }
  if (!(await avatarSaleContract.verify(...args))) {
    throw new Error(`Message does not verify ${JSON.stringify(args, null, 4)}`);
  }

  if (processArgs.approve) {
    const sandContract = await ethers.getContract('PolygonSand', wallet);
    console.log('Calling approve');
    const approveTx = await sandContract.approve(
      avatarSaleContract.address,
      price
    );
    const approveTxResult = await approveTx.wait();
    console.log('Approve result', approveTxResult);
  }

  console.log('Calling execute');
  const executeTx = await avatarSaleContract.execute(...args);
  const executeTxResult = await executeTx.wait();
  console.log('Execute result', executeTxResult);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
