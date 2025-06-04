// Hardhat-deploy don't support factory and beacons the way we use it
// We are forced to save the deployment by hand
import {
  DeploymentsExtension,
  DeploymentSubmission,
  Receipt,
} from 'hardhat-deploy/types';
import {Contract} from 'ethers';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import * as fs from 'node:fs';
import path from 'path';

export async function saveDeployment(
  deployments: DeploymentsExtension,
  address: string,
  artifactName: string,
  contractName: string,
  receipt?: Receipt,
  proxyImplAddress?: string,
  args?: unknown[]
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
    args,
    ...extendedArtifact,
    ...(receipt
      ? {
          receipt,
          transactionHash: receipt.transactionHash,
        }
      : {}),
    ...(proxyImplAddress ? {implementation: proxyImplAddress} : {}),
  } as DeploymentSubmission);
}

export function getEventArgsFromReceipt(
  contract: Contract,
  receipt: Receipt,
  eventName: string
) {
  const fragment = contract.filters[eventName].fragment;
  const ev = receipt.events?.find((x) => x.topics[0] == fragment.topicHash);
  return ev.args;
}

export async function getAddressOrNull(
  hre: HardhatRuntimeEnvironment,
  networkName: string,
  contractName: string
) {
  const deploymentsPath = path.join(hre.config.paths.deployments, networkName);
  const deploymentFile = path.join(deploymentsPath, `${contractName}.json`);
  if (!fs.existsSync(deploymentFile)) {
    console.warn(
      `getAddressOrNull missing deployment for ${contractName} in ${deploymentsPath}`
    );
    return null;
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  if (!deployment.address) {
    throw new Error(`getAddressOrNull wrong deployment file ${deploymentFile}`);
  }
  return deployment.address;
}
