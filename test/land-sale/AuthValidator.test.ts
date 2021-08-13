import {expect} from 'chai';
import {ethers} from 'hardhat';
import {setupAuthValidator} from './fixtures';

describe.only("AuthValidator", function () {
  it("signature should be valid", async function () {
    const {authValidatorContract, backendAuthWallet, getNamedAccounts} = await setupAuthValidator();
    const {deployer} = await getNamedAccounts()
    const hashedData = ethers.utils.solidityKeccak256(['address'], [deployer]);
    const signature = await backendAuthWallet.signMessage(ethers.utils.arrayify(hashedData))

    const res = await authValidatorContract.isAuthValid(signature, hashedData);
    expect(res).to.equal(true);
  })

  it("signature should be invalid", async function () {
    const {authValidatorContract, getNamedAccounts} = await setupAuthValidator();
    const {deployer} = await getNamedAccounts()
    const wallet = await ethers.getSigner(deployer);
    const hashedData = ethers.utils.solidityKeccak256(['address'], [deployer]);
    const signature = await wallet.signMessage(ethers.utils.arrayify(hashedData))

    const res = await authValidatorContract.isAuthValid(signature, hashedData);
    expect(res).to.equal(false);
  })
})