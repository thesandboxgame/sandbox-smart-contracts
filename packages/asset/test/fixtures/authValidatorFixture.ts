import {ethers} from 'hardhat';
import {createMockDigest, createMockSignature} from '../utils/createSignature';
const runSetup = async () => {
  const [deployer, authValidatorAdmin, backendSigner] =
    await ethers.getSigners();

  const AuthValidatorFactory = await ethers.getContractFactory('AuthValidator');
  const AuthValidatorContract = await AuthValidatorFactory.connect(
    deployer
  ).deploy(authValidatorAdmin.address);
  await AuthValidatorContract.deployed();

  const AuthValidatorContractAsAdmin = await AuthValidatorContract.connect(
    authValidatorAdmin
  );

  const MockContractFactory = await ethers.getContractFactory('MockAsset');
  const MockContract = await MockContractFactory.connect(deployer).deploy();
  await MockContract.deployed();

  return {
    authValidatorAdmin,
    AuthValidatorContract,
    AuthValidatorContractAsAdmin,
    MockContract,
    backendSigner,
    createMockDigest,
    createMockSignature,
  };
};

export default runSetup;
