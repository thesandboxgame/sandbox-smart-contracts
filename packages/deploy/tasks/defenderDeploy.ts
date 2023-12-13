/*
  This task extends the hardhat-deploy deploy target in two aspects:
    1. It forbid the use of catchUnknownSigner + execute and propose the use of
    executeAction instead. This method is similar but takes a description that
    is used to create defender actions to be executed by a multisig.
    2. It catches the calls to deploy and give the option of creating defender
    deploy tasks instead.
 */
import {task, types} from 'hardhat/config';
import 'dotenv/config';
import 'hardhat-deploy';
import {HardhatPluginError} from 'hardhat/plugins';
import * as fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployClient} from '@openzeppelin/defender-sdk-deploy-client';
import {
  CollectedDefenderActionsType,
  CollectedDefenderDeploysType,
  DefenderJSONFile,
} from '../utils/defenderCommon';
import {prompt} from 'enquirer';
import {ProposalClient} from '@openzeppelin/defender-sdk-proposal-client';

type DeployDta =
  | {
      type: 'action';
      data: CollectedDefenderActionsType;
    }
  | {
      type: 'deploy';
      data: CollectedDefenderDeploysType;
    };

async function select(choices: {[k: string]: DeployDta}): Promise<DeployDta[]> {
  const ans = await prompt<{answer: string[]}>({
    name: 'answer',
    type: 'multiselect',
    choices: Object.keys(choices).map((x) => ({name: x, value: choices[x]})),
    message: 'Select deploys',
  });
  return Object.keys(choices)
    .filter((x) => ans.answer.includes(x))
    .map((x) => choices[x]);
}

function getFQN(d: CollectedDefenderDeploysType): string {
  return d.options.contract && typeof d.options.contract === 'string'
    ? (d.options.contract as string)
    : d.name;
}

async function defenderAction(
  hre: HardhatRuntimeEnvironment,
  client: ProposalClient,
  deploy: CollectedDefenderActionsType
) {
  // TODO: Filter the already added ones ?
  // const l = await client.list({includeArchived: false});
  const d = await hre.deployments.get(deploy.name);
  // 'EOA' | 'Safe' | 'Gnosis Multisig' | 'Relayer';
  await client.create({
    proposal: {
      contract: {
        network: hre.network.name,
        address: d.address,
        abi: JSON.stringify(d.abi),
      },
      title: `action-${deploy.name}.${deploy.methodName}`,
      description: `execute ${deploy.methodName} on ${deploy.name}. network ${hre.network.name}`,
      type: 'custom',
      functionInterface: d.abi.find(
        (a) =>
          a.name === deploy.methodName && a.inputs.length === deploy.args.length
      ),
      functionInputs: deploy.args.map((a) => {
        const ret = a as string;
        if (a === 'true') return true;
        if (a === 'false') return false;
        return ret;
      }),
      via: deploy.options.from,
      // TODO: ?
      //  'EOA' | 'Safe' | 'Gnosis Multisig' | 'Relayer'
      // viaType: deploy.options.viaType || viaTypes.GnosisSafe,
    },
  });
}

async function defenderDeploy(
  hre: HardhatRuntimeEnvironment,
  client: DeployClient,
  deploy: CollectedDefenderDeploysType
) {
  const fqn = getFQN(deploy);
  const buildInfo = await hre.artifacts.getBuildInfo(fqn);
  const artifact = await hre.artifacts.readArtifact(fqn);
  // constructorInputs - The inputs to your contract constructor,
  // value - ETH to be sent with the deployment.
  // salt - deployments are done using the CREATE2 opcode, you can provide a salt or we can generate one for you if none is supplied.
  // licenseType - This will be displayed on Etherscan e.g MIT.
  // libraries - If you contract uses any external libraries they will need to be added here in the format { [LibraryName]: LibraryAddress }.
  // relayerId - This property will override the default relayer assigned to the approval process for deployments. You may define this property if you wish to use a different relayer than the one assigned to the approval process in the deploy environment.

  // TODO: Deal with upgradable contracts
  console.log('deploy', fqn, 'with', deploy.options);
  await client.deployContract({
    contractName: artifact.contractName,
    contractPath: artifact.sourceName,
    verifySourceCode: false,
    network: hre.network.name,
    artifactPayload: JSON.stringify(buildInfo),
    constructorInputs: deploy.options.args,
    value: deploy.options.value && deploy.options.value.toString(),
  });
  //
  // await client.deploy.upgradeContract({
  //   upgradeParams: {
  //     proxyAddress: '0xABC1234...',
  //     proxyAdminAddress: '0xDEF1234...',
  //     newImplementationABI: JSON.stringify(boxABIFile),
  //     newImplementationAddress: '0xABCDEF1....',
  //     network: 'mumbai',
  //   },
  // });
}

task('defender', 'use defender admin to propose transactions')
  .addOptionalParam(
    'actionsFilename',
    'file name to save the actions',
    'defenderActions.json',
    types.string
  )
  .addFlag('dryrun', 'dry run')
  .addFlag('yes', "don't ask on each action")
  .setAction(
    async (
      args: {
        defender: boolean;
        actionsFilename: string | undefined;
        dryrun: boolean;
        yes: boolean;
      },
      hre
    ) => {
      if (!process.env.DEFENDER_KEY || !process.env.DEFENDER_SECRET) {
        throw new HardhatPluginError(
          'you must configure DEFENDER_SECRET and DEFENDER_KEY in .env'
        );
      }

      const fileName = args.actionsFilename as string;
      console.log(`reading ${fileName}`);
      const collectedData: DefenderJSONFile = JSON.parse(
        fs.readFileSync(fileName, 'utf-8')
      );
      const networkName = hre.network.name;
      if (networkName !== collectedData.network) {
        throw new HardhatPluginError(
          `network miss match ${networkName} != ${collectedData.network}`
        );
      }
      const proposalClient = new ProposalClient({
        apiKey: process.env.DEFENDER_KEY,
        apiSecret: process.env.DEFENDER_SECRET,
      });
      const deployClient = new DeployClient({
        apiKey: process.env.DEFENDER_KEY,
        apiSecret: process.env.DEFENDER_SECRET,
      });
      // if (!args.dryrun) {
      //   const approval = await deployClient.getDeployApprovalProcess(
      //     networkName
      //   );
      //   console.log(`Approval process for ${networkName}`, approval);
      //   const upgradeApproval = await deployClient.getUpgradeApprovalProcess(
      //     networkName
      //   );
      //   console.log(
      //     `Upgrade approval process for ${networkName}`,
      //     upgradeApproval
      //   );
      // }
      const cList = await deployClient.listDeployments();
      const contracts: Set<string> = new Set();
      cList.forEach((x) =>
        contracts.add(x.contractPath + ':' + x.contractName)
      );
      const choices: {[k: string]: DeployDta} = collectedData.deploys
        .filter((x) => !contracts.has(getFQN(x)))
        .reduce(
          (acc, val) => ({
            ...acc,
            ['deploy-' + val.name]: {type: 'deploy', data: val},
          }),
          {}
        );
      collectedData.actions.forEach(
        (x) =>
          (choices[`action-${x.name}.${x.methodName}`] = {
            type: 'action',
            data: x,
          })
      );

      const toDeploy: DeployDta[] = args.yes
        ? Object.values(choices)
        : await select(choices);
      for (const d of toDeploy) {
        if (d.type === 'deploy') {
          console.log(d.type, d.data.name, getFQN(d.data));
          if (!args.dryrun) {
            await defenderDeploy(hre, deployClient, d.data);
          }
        } else {
          console.log(d.type, d.data);
          if (!args.dryrun) {
            await defenderAction(hre, proposalClient, d.data);
          }
        }
      }
    }
  );
