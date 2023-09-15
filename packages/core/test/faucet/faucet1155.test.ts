
import {ethers} from 'hardhat';
import {expect} from '../chai-setup';
import {Contract, Signer} from 'ethers';

describe.only("ERC1155Faucet", function () {
  let owner: Signer;
  let user1: Signer;
  let faucetContract: Contract;
  const erc1155TokenId = 1;
  const erc1155Amount = 100;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    const ERC1155Token = await ethers.getContractFactory("MockAssetERC1155");
    const erc1155Token = await ERC1155Token.deploy();
    await erc1155Token.deployed();
    const Faucet = await ethers.getContractFactory("ERC1155Faucet");
    faucetContract = await Faucet.deploy(erc1155Token.address);
    await faucetContract.deployed();
    await faucetContract.addFaucet(owner.getAddress(), 3600, erc1155TokenId, erc1155Amount);
  });

  it("Should allow a user to claim ERC1155 tokens", async function () {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await faucetContract.connect(user1).claim(owner.getAddress(), erc1155TokenId, 10);
    const user1Balance = await faucetContract.getBalance(owner.getAddress(), erc1155TokenId);
    expect(user1Balance).to.equal(10);
  });

  it("Should not allow a user to claim more than the limit", async function () {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await expect(faucetContract.connect(user1).claim(owner.getAddress(), erc1155TokenId, erc1155Amount + 1)).to.be.revertedWith("Faucets: AMOUNT_EXCEEDED_LIMIT");
  });
});
