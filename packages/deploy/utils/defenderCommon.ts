import {DeployOptions, TxOptions} from 'hardhat-deploy/types';

export type CollectedDefenderActionsType = {
  name: string;
  options: TxOptions;
  methodName: string;
  args: unknown[];
};
export type CollectedDefenderDeploysType = {
  name: string;
  options: DeployOptions;
};
export type DefenderJSONFile = {
  network: string;
  actions: CollectedDefenderActionsType[];
  deploys: CollectedDefenderDeploysType[];
};
