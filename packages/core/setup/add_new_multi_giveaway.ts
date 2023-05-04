/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/add_new_multi_giveaway.ts <GIVEAWAY_CONTRACT> <GIVEAWAY_NAME>
 *
 * GIVEAWAY_CONTRACT: from data/giveaways/multi_giveaway_1/detective_letty.json then the giveaway contract is: Multi_Giveaway_1
 * GIVEAWAY_NAME: from data/giveaways/multi_giveaway_1/detective_letty.json then the giveaway name is: detective_letty
 */
import fs from 'fs-extra';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

import {createClaimMerkleTree} from '../data/giveaways/getClaims';
import helpers, {MultiClaim} from '../lib/merkleTreeHelper';

const {calculateMultiClaimHash} = helpers;

const args = process.argv.slice(2);
const claimContract = args[0];
const claimFile = args[1];
const ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const func: DeployFunction = async function () {
  const {deployments, network, getChainId, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const chainId = await getChainId();
  const {multiGiveawayAdmin} = await getNamedAccounts();

  let claimData: MultiClaim[];
  try {
    claimData = fs.readJSONSync(
      `data/giveaways/${claimContract.toLowerCase()}/${claimFile}.json`
    );
  } catch (e) {
    console.log('Error', e);
    return;
  }

  const {merkleRootHash, saltedClaims, tree} = createClaimMerkleTree(
    hre,
    claimData,
    claimContract
  );

  const contractAddresses: string[] = [];
  const addAddress = (address: string) => {
    address = address.toLowerCase();
    if (!contractAddresses.includes(address)) contractAddresses.push(address);
  };
  claimData.forEach((claim) => {
    claim.erc1155.forEach((erc1155) => addAddress(erc1155.contractAddress));
    claim.erc721.forEach((erc721) => addAddress(erc721.contractAddress));
    claim.erc20.contractAddresses.forEach((erc20) => addAddress(erc20));
  });
  const allDeployments = Object.values(await deployments.all());
  for (const contractAddress of contractAddresses) {
    const deployment = allDeployments.find(
      (d) => d.address.toLowerCase() === contractAddress
    );
    if (!deployment) {
      console.warn(`Contract ${contractAddress} not found`);
    }
  }

  const giveawayContract = await deployments.getOrNull(claimContract);
  if (!giveawayContract) {
    console.log(`No ${claimContract} deployment`);
    return;
  }

  const isMultiGiveAwaySuperOperator = await read(
    claimContract,
    'hasRole',
    ADMIN_ROLE,
    multiGiveawayAdmin
  ).catch(() => null);

  let currentAdmin = multiGiveawayAdmin;

  if (!isMultiGiveAwaySuperOperator) {
    currentAdmin = await read(claimContract, 'getAdmin');
  }

  await catchUnknownSigner(
    execute(
      claimContract,
      {from: currentAdmin, log: true},
      'addNewGiveaway',
      merkleRootHash,
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' // do not expire
    )
  );

  console.log(`New giveaway added with merkleRootHash: ${merkleRootHash}`);

  const claimsWithProofs: (MultiClaim & {proof: string[]})[] = [];
  for (const claim of saltedClaims) {
    claimsWithProofs.push({
      ...claim,
      proof: tree.getProof(calculateMultiClaimHash(claim)),
    });
  }
  const basePath = `./secret/multi-giveaway/${network.name}`;
  const proofPath = `${basePath}/.multi_claims_proofs_${claimFile}_${chainId}.json`;
  const rootHashPath = `${basePath}/.multi_claims_root_hash_${claimFile}_${chainId}.json`;
  fs.outputJSONSync(proofPath, claimsWithProofs);
  fs.outputFileSync(rootHashPath, merkleRootHash);
  console.log(`Proofs at: ${proofPath}`);
  console.log(`Hash at: ${rootHashPath}`);
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
