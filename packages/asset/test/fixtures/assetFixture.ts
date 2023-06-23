import { deployments, getUnnamedAccounts } from "hardhat";

export type AssetMintData = {
  creator: string;
  amount: number;
  tier: number;
  isNFT: boolean;
  revealed: boolean;
  revealHash: number;
};

export function getAssetData(
  creator: string,
  amount: number,
  tier: number,
  creatorNonce: number,
  isNFT: boolean,
  revealed: boolean,
  revealHash: number
) {
  return {
    creator: creator,
    amount: amount,
    tier: tier,
    creatorNonce: creatorNonce,
    isNFT: isNFT,
    revealed: revealed,
    revealHash: revealHash,
  };
}

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
    await deployments.fixture(["Asset"]);
    const { deployer, revealer } = await getNamedAccounts();
    const users = await getUnnamedAccounts();
    const owner = users[0];
    const secondOwner = users[1];
    const bridgeMinter = users[2];
    const AssetContract = await ethers.getContract("Asset", deployer);
    const Asset = await ethers.getContract("Asset");
    const minterRole = await AssetContract.MINTER_ROLE();
    const bridgeMinterRole = await AssetContract.BRIDGE_MINTER_ROLE();
    await AssetContract.grantRole(minterRole, deployer);
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
      Asset,
      revealer,
      owner,
      secondOwner,
      bridgeMinter,
      minterRole,
      bridgeMinterRole,
      uris,
      baseUri,
    };
  }
);