import {expect} from '../chai-setup';
import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';
import {Address} from 'hardhat-deploy/types';
import {expectEventWithArgs, setupUsers, waitFor} from '../utils';
const {read} = deployments;

type User = {
  address: string;
  WithReferralValidator: Contract;
};

type User2 = {
  address: string;
};

const setupTest = deployments.createFixture(
  async (): Promise<{
    WithReferralValidator: Contract;
    validators: User[];
  }> => {
    await deployments.fixture('WithReferralValidator');
    const WithReferralValidator = await ethers.getContract(
      'WithReferralValidator'
    );
    const unnamedAccounts = await getUnnamedAccounts();
    const validators = await setupUsers(unnamedAccounts, {
      WithReferralValidator,
    });
    return {WithReferralValidator, validators};
  }
);

/*
describe('GameToken', function () {
  before(async function () {
    const {GameOwner, gameToken} = await setupTest();
    const assets = await supplyAssets(GameOwner.address, [1]);
    const assetContract = await ethers.getContract('Asset');
    id = assets[0];

    const isSuperOperator = await assetContract.isSuperOperator(
      gameToken.address
    );
    expect(isSuperOperator).to.be.true;
  });
*/

it('WithReferralValidator.sol', function () {
  before(async function () {
    //const sandAdmin = await getNamedAccounts();
    const sandAdmin = await read('WithReferralValidator', 'getAdmin');
    const newSigner = '0xD1Df0BB44804f4Ac75286E9b1AE66c27CBCb5c7C';
    const oldSigningWallet = await read(
      'WithReferralValidator',
      'getSigningWallet'
    );
    await waitFor(
      sandAdmin.WithReferralValidator.updateSigningWallet(newSigner)
    );
    const newWallet = await sandAdmin.WithReferralValidator.getSigningWallet();
    expect(newWallet).to.equal(newSigner);
  });
});
