import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {setupAuthValidator, backendAuthWallet} from './fixtures';

describe('AuthValidator', function () {
  it('signature should be valid', async function () {
    const {authValidatorContract} = await setupAuthValidator();
    const {deployer} = await getNamedAccounts();
    const hashedData = ethers.utils.solidityKeccak256(['address'], [deployer]);
    const signature = await backendAuthWallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const res = await authValidatorContract.isAuthValid(signature, hashedData);
    expect(res).to.equal(true);
  });

  it('signature should be invalid', async function () {
    const {authValidatorContract} = await setupAuthValidator();
    const {deployer} = await getNamedAccounts();
    const wallet = await ethers.getSigner(deployer);
    const hashedData = ethers.utils.solidityKeccak256(['address'], [deployer]);
    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const res = await authValidatorContract.isAuthValid(signature, hashedData);
    expect(res).to.equal(false);
  });
});
