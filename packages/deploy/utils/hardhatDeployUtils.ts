// Hardhat-deploy don't support factory and beacons the way we use it
// We are forced to save the deployment by hand
import {
  DeploymentsExtension,
  DeploymentSubmission,
  Receipt,
} from 'hardhat-deploy/types';
import {Contract} from 'ethers';

export async function saveDeployment(
  deployments: DeploymentsExtension,
  address: string,
  artifactName: string,
  contractName: string,
  receipt?: Receipt,
  implementationAddress?: string
) {
  const extendedArtifact = await deployments.getExtendedArtifact(contractName);
  if (receipt) {
    console.log(
      `saving "${artifactName}" (tx: ${receipt.transactionHash})...: deployed at ${address} with ${receipt.gasUsed} gas`
    );
  } else {
    console.log(
      `saving "${artifactName}"...: deployed at ${address} without receipt`
    );
  }
  await deployments.save(artifactName, {
    address,
    ...extendedArtifact,
    ...(receipt
      ? {
          receipt,
          transactionHash: receipt.transactionHash,
        }
      : {}),
    ...(implementationAddress ? {implementation: implementationAddress} : {}),
  } as DeploymentSubmission);
}

export function getEventArgsFromReceipt(
  contract: Contract,
  receipt: Receipt,
  eventName: string
) {
  const fragment = contract.filters[eventName].fragment;
  const ev = receipt.events.find((x) => x.topics[0] == fragment.topicHash);
  return ev.args;
}
