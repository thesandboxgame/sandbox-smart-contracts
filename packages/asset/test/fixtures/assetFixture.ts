import { deployments, getUnnamedAccounts } from "hardhat";

export function generateOldAssetId(
  creator: string,
  assetNumber: number,
  isNFT: boolean
) {
  const hex = assetNumber.toString(16);
  const hexLength = hex.length;
  let zeroAppends = "";
  const zeroAppendsLength = 24 - hexLength;
  for (let i = 0; i < zeroAppendsLength; i++) {
    if (i == zeroAppendsLength - 1) {
      if (isNFT) {
        zeroAppends = "8" + zeroAppends;
      } else {
        zeroAppends = zeroAppends + "0";
      }
    } else {
      zeroAppends = zeroAppends + "0";
    }
  }
  return `${creator}${zeroAppends}${hex}`;
}

export const runAssetSetup = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    // TODO: DO NOT USE DEPLOY SCRIPTS FOR TESTS
    await deployments.fixture(["Asset"]);
    const { deployer, assetAdmin } = await getNamedAccounts();
    const users = await getUnnamedAccounts();
    const owner = users[2];
    const secondOwner = users[3];
    const bridgeMinter = users[4];
    const AssetContract = await ethers.getContract("Asset");

    // Asset contract is not user-facing and we block users from minting directly
    // Contracts that interact with Asset must have the necessary ROLE
    // Here we set up the necessary roles for testing
    const AssetContractAsAdmin = await ethers.getContract("Asset", assetAdmin);
    const AssetContractAsMinter = await ethers.getContract("Asset", users[0]);
    const AssetContractAsBurner = await ethers.getContract("Asset", users[1]);
    const AssetContractAsOwner = await ethers.getContract("Asset", users[2]); 
    const defaultAdminRole = await AssetContract.DEFAULT_ADMIN_ROLE();
    const minterRole = await AssetContract.MINTER_ROLE();
    const burnerRole = await AssetContract.BURNER_ROLE();
    const bridgeMinterRole = await AssetContract.BRIDGE_MINTER_ROLE();
    // end set up roles

    await AssetContract.grantRole(minterRole, users[0]); 
    await AssetContract.grantRole(burnerRole, users[1]); 
    await AssetContract.grantRole(bridgeMinterRole, bridgeMinter);
    const uris = [
      "QmSRVTH8VumE42fqmdzPHuA57LjCaUXQRequVzEDTGMyHY",
      "QmTeRr1J2kaKM6e1m8ixLfZ31hcb7XNktpbkWY5tMpjiFR",
      "QmUxnKe5DyjxKuwq2AMGDLYeQALnQxcffCZCgtj5a41DYw",
      "QmYQztw9x8WyrUFDxuc5D4xYaN3pBXWNGNAaguvfDhLLgg",
      "QmUXH1JBPMYxCmzNEMRDGTPtHmePvbo4uVEBreN3sowDwG",
      "QmdRwSPCuPGfxSYTaot9Eqz8eU9w1DGp8mY97pTCjnSWqk",
      "QmNrwUiZfQLYaZFHNLzxqfiLxikKYRzZcdWviyDaNhrVhm",
    ];
    const baseUri = "ipfs://";

    return {
      deployer,
      AssetContract,
      AssetContractAsOwner,
      AssetContractAsMinter,
      AssetContractAsBurner,
      AssetContractAsAdmin,
      owner,
      secondOwner,
      bridgeMinter,
      minterRole,
      burnerRole,
      defaultAdminRole,
      bridgeMinterRole,
      uris,
      baseUri,
    };
  }
);