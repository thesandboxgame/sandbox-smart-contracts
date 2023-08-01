import {ethers} from 'hardhat';
import {expect} from 'chai';
import {constants, Contract} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/src/signers';

async function setupContract(contract: Contract, signers: SignerWithAddress[]) {
  const [, deployer, trustedForwarder, other] = signers;
  const contractAsDeployer = await contract.connect(deployer);
  const contractAsTrustedForwarder = await contract.connect(trustedForwarder);
  const contractAsOther = await contract.connect(other);

  return {
    deployer,
    trustedForwarder,
    other,
    contractAsDeployer,
    contractAsTrustedForwarder,
    contractAsOther,
  };
}

export type SetupType = Awaited<ReturnType<typeof setupContract>>;

export async function setupERC2771() {
  const signers = await ethers.getSigners();
  const [, , trustedForwarder] = signers;
  const contractFactory = await ethers.getContractFactory('ERC2771HandlerTest');
  const contract = await contractFactory.deploy(trustedForwarder.address);
  await contract.deployed();
  return setupContract(contract, signers);
}

export async function setupERC2771Upgradable() {
  const signers = await ethers.getSigners();
  const contractFactory = await ethers.getContractFactory(
    'ERC2771HandlerUpgradeableTest'
  );
  const contract = await contractFactory.deploy();
  await contract.deployed();
  return await setupContract(contract, signers);
}

export async function setupAndInitializeERC2771Upgradable() {
  const ret = await setupERC2771Upgradable();
  await expect(ret.contractAsDeployer.initialize(ret.trustedForwarder.address))
    .to.emit(ret.contractAsDeployer, 'TrustedForwarderSet')
    .withArgs(
      constants.AddressZero,
      ret.trustedForwarder.address,
      ret.deployer.address
    );
  return ret;
}
