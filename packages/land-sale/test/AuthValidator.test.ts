import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {setupAuthValidator} from './fixtures';

describe('AuthValidator', function () {
  it('signature should be valid', async function () {
    const {AuthValidatorContract, backendAuthWallet} =
      await setupAuthValidator();
    const {deployer} = await getNamedAccounts();
    const hashedData = ethers.solidityPackedKeccak256(['address'], [deployer]);
    const signature = await backendAuthWallet.signMessage(
      ethers.getBytes(hashedData),
    );

    const res = await AuthValidatorContract.isAuthValid(signature, hashedData);
    expect(res).to.equal(true);
  });

  it('signature should be invalid', async function () {
    const {AuthValidatorContract} = await setupAuthValidator();
    const {deployer} = await getNamedAccounts();
    const wallet = await ethers.getSigner(deployer);
    const hashedData = ethers.solidityPackedKeccak256(['address'], [deployer]);
    const signature = await wallet.signMessage(ethers.getBytes(hashedData));

    const res = await AuthValidatorContract.isAuthValid(signature, hashedData);
    expect(res).to.equal(false);
  });
});
