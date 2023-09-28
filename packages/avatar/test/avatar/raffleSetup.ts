import { assert } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { getTestingAccounts} from "./fixtures";
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { GenericRaffle } from '../../typechain-types/contracts/raffleold/contracts/GenericRaffle';

export async function setupRaffleContract(
  contractName: string, 
  collectionMaxSupply: number, 
  initializationArgs: Array<any>
): Promise<{
  collectionContract: GenericRaffle;
  collectionOwner: HardhatEthersSigner;
  collectionContractAsOwner: GenericRaffle;
  randomWallet: HardhatEthersSigner;
  collectionContractAsRandomWallet: GenericRaffle;
}> {

  const {
    deployer,
    randomWallet,
  } = await getTestingAccounts();

  const RaffleImplementationContract = await ethers.getContractFactory(contractName);
  
  upgrades.silenceWarnings();
  const raffleContract = await upgrades.deployProxy(
    RaffleImplementationContract, 
    initializationArgs, 
    {
      initializer: "initialize",
      // the old Raffle contract had a wave = 0 assignment, so we either modify the contract (need audit) or add this
      // the new Raffle contract has a constructor with initialization disabled call; same logic as above
      unsafeAllow: ["state-variable-assignment", "constructor"]
    }
 );

  const collectionContractAsOwner = raffleContract.connect(deployer) as unknown as GenericRaffle;
  
  assert.equal(
    (await collectionContractAsOwner.maxSupply()).toString(),
    collectionMaxSupply.toString(), "possible collection miss-match"
  );
  
  return {
    collectionContract: raffleContract as unknown as GenericRaffle,
    collectionOwner: deployer,
    collectionContractAsOwner,
    randomWallet,
    collectionContractAsRandomWallet: raffleContract.connect(randomWallet) as unknown as GenericRaffle,
  }
};