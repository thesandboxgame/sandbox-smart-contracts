/*
  This task extends the hardhat-deploy deploy target in two aspects:
    1. It forbid the use of catchUnknownSigner + execute and propose the use of
    executeAction instead. This method is similar but takes a description that
    is used to create defender actions to be executed by a multisig.
    2. It catches the calls to deploy and give the option of creating defender
    deploy tasks instead.
 */
import {extendEnvironment, task, types} from 'hardhat/config';
import 'dotenv/config';
import 'hardhat-deploy';
import {HardhatPluginError, lazyFunction} from 'hardhat/plugins';
import {
  DeploymentsExtension,
  DeployOptions,
  DeployResult,
  Receipt,
  TxOptions,
} from 'hardhat-deploy/types';
import {TASK_DEPLOY} from 'hardhat-deploy';
import * as fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  CollectedDefenderActionsType,
  CollectedDefenderDeploysType,
} from '../utils/defenderCommon';
import {UnknownSignerError} from 'hardhat-deploy/dist/src/errors';
import {InvalidInputError} from 'hardhat/internal/core/providers/errors';

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    _defender:
      | undefined
      | {
          captureAll: boolean;
          collectedActions: CollectedDefenderActionsType[];
          collectedDeploys: CollectedDefenderDeploysType[];
        };
  }
}

function deployHook(
  hre: HardhatRuntimeEnvironment,
  orig: DeploymentsExtension
) {
  return async (
    name: string,
    options: DeployOptions
  ): Promise<DeployResult> => {
    const result = await orig.deploy(name, options);
    if (!hre._defender) {
      return result;
    }
    if (result.newlyDeployed) {
      hre._defender.collectedDeploys.push({name, options});
    }
    return result;
  };
}

function executeActionHook(
  hre: HardhatRuntimeEnvironment,
  orig: DeploymentsExtension
) {
  return async (
    name: string,
    options: TxOptions,
    methodName: string,
    ...args: unknown[]
  ): Promise<Receipt> => {
    if (!hre._defender) {
      return await orig.execute(name, options, methodName, ...args);
    }
    if (hre._defender.captureAll) {
      hre._defender.collectedActions.push({
        name,
        options,
        methodName,
        args,
      });
    }
    try {
      return await orig.execute(name, options, methodName, ...args);
    } catch (e) {
      if (
        !hre._defender.captureAll &&
        (e instanceof UnknownSignerError || e instanceof InvalidInputError)
      ) {
        hre._defender.collectedActions.push({
          name,
          options,
          methodName,
          args,
        });
      }
      if (!(e instanceof InvalidInputError)) {
        throw e;
      }
      // Trick to keep going
      return {
        blockHash: '',
        blockNumber: 0,
        cumulativeGasUsed: 0,
        from: '',
        gasUsed: 0,
        transactionHash: '',
        transactionIndex: 0,
      };
    }
  };
}

extendEnvironment((hre) => {
  const origClone: DeploymentsExtension = Object.assign({}, hre.deployments);
  hre.deployments.deploy = lazyFunction(() => deployHook(hre, origClone));
  hre.deployments.execute = lazyFunction(() =>
    executeActionHook(hre, origClone)
  );
});
task(TASK_DEPLOY, 'use defender admin to propose transactions')
  .addFlag('defender', 'collection of defender actions')
  .addFlag('captureAll', 'force the collection of all the defender actions')
  .addOptionalParam(
    'actionsFilename',
    'file name to save the actions',
    'defenderActions.json',
    types.string
  )
  .setAction(
    async (
      args: {
        defender: boolean;
        actionsFilename: string | undefined;
        captureAll: boolean;
      },
      hre,
      runSuper
    ) => {
      if (!args.defender) {
        return await runSuper(args);
      }
      if (!process.env.HARDHAT_FORK) {
        throw new HardhatPluginError('must use a fork to capture');
      }
      hre._defender = {
        captureAll: args.captureAll,
        collectedActions: [],
        collectedDeploys: [],
      };
      const ret = await runSuper({...args, write: false});
      const fileName = args.actionsFilename as string;
      console.log(`saving to ${fileName}`);
      fs.writeFileSync(
        fileName,
        JSON.stringify(
          {
            network: process.env.HARDHAT_FORK,
            actions: hre._defender.collectedActions,
            deploys: hre._defender.collectedDeploys,
          },
          null,
          4
        )
      );
      return ret;
    }
  );
