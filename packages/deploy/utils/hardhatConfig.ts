import {HARDHAT_NETWORK_NAME} from 'hardhat/plugins';
import {HardhatUserConfig} from 'hardhat/config';
import {MultiSolcUserConfig, NetworksUserConfig} from 'hardhat/types';
import {ArgumentsParser} from 'hardhat/internal/cli/ArgumentsParser';
import {HARDHAT_PARAM_DEFINITIONS} from 'hardhat/internal/core/params/hardhat-params';
import {getEnvHardhatArguments} from 'hardhat/internal/core/params/env-variables';

// Taken from hardhat
function parseArgs() {
  const argumentsParser = new ArgumentsParser();
  const parsed = argumentsParser.parseHardhatArguments(
    HARDHAT_PARAM_DEFINITIONS,
    getEnvHardhatArguments(HARDHAT_PARAM_DEFINITIONS, process.env),
    process.argv.slice(2)
  );
  // we assume no default network in our conf.
  return {
    taskName: parsed.scopeOrTaskName,
    network: parsed.hardhatArguments.network || HARDHAT_NETWORK_NAME,
  };
}

export function nodeUrl(networkName: string): string {
  const envName = 'ETH_NODE_URI_' + networkName.toUpperCase();
  const uri = process.env[envName];
  if (!uri || uri.trim().length === 0) {
    throw new Error(`${envName} must be configured in .env`);
  }
  return uri;
}

export function getMnemonic(networkName?: string): string {
  if (networkName) {
    const mnemonic = process.env['MNEMONIC_' + networkName.toUpperCase()];
    if (mnemonic && mnemonic !== '') {
      return mnemonic;
    }
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic || mnemonic === '') {
    return 'test test test test test test test test test test test junk';
  }
  return mnemonic;
}

export function getVerifyApiKey(networkName?: string): string {
  return process.env[`ETHERSCAN_API_KEY_${networkName?.toUpperCase()}`] || '';
}

export function addNodeAndMnemonic(
  networks: NetworksUserConfig
): NetworksUserConfig {
  const args = parseArgs();
  const ret: NetworksUserConfig = {};
  for (const k in networks) {
    if (k === 'localhost' || k == HARDHAT_NETWORK_NAME || k == args.network) {
      ret[k] = networks[k];
      // companionNetworks
      Object.values(networks[k].companionNetworks).forEach((x: string) => {
        ret[x] = networks[x];
      });
    }
  }
  console.log(
    `Setting url and mnemonic for the following networks: ${Object.keys(ret)}`
  );
  for (const k in ret) {
    if (k === 'localhost' || k == HARDHAT_NETWORK_NAME) continue;

    ret[k] = {
      ...ret[k],
      url: nodeUrl(k),
      accounts: {
        mnemonic: getMnemonic(k),
      },
      verify: {
        etherscan: {
          apiKey: getVerifyApiKey(k),
        },
      },
    };
  }
  return ret;
}

export function skipDeploymentsOnLiveNetworks(
  conf: HardhatUserConfig
): HardhatUserConfig {
  const args = parseArgs();
  // We want to run deployments on hardhat but not on live nets
  // The problem is that hardhat-deploy always run the fixtures when testing
  // maybe there is a better way to do it:
  const testingLive =
    args.taskName === 'test' && args.network != HARDHAT_NETWORK_NAME;
  if (!conf.networks || !testingLive) {
    return conf;
  }
  const networks = conf.networks as NetworksUserConfig;
  return {
    ...conf,
    networks: Object.keys(networks).reduce(
      (acc, val) => ({
        ...acc,
        [val]: {...networks[val], deploy: []},
      }),
      {}
    ),
  };
}

export function addForkingSupport(conf: HardhatUserConfig): HardhatUserConfig {
  if (!process.env.HARDHAT_FORK) {
    return conf;
  }
  const d =
    (conf.networks &&
      conf.networks['hardhat'] &&
      conf.networks['hardhat']?.deploy) ||
    [];
  const deploy = typeof d === 'string' ? [d] : d;
  return {
    ...conf,
    networks: {
      ...conf.networks,
      hardhat: {
        ...(conf.networks ? conf.networks['hardhat'] : {}),
        deploy: process.env.HARDHAT_FORK_INCLUDE_MOCKS
          ? deploy
          : deploy.filter((x) => !x.includes('mock')),
        accounts: {
          mnemonic: getMnemonic(process.env.HARDHAT_FORK),
        },
        forking: process.env.HARDHAT_FORK
          ? {
              enabled: true,
              url: nodeUrl(process.env.HARDHAT_FORK),
              blockNumber: process.env.HARDHAT_FORK_NUMBER
                ? parseInt(process.env.HARDHAT_FORK_NUMBER)
                : undefined,
            }
          : undefined,
      },
    },
    external: process.env.HARDHAT_FORK
      ? {
          deployments: {
            hardhat: ['deployments/' + process.env.HARDHAT_FORK],
          },
        }
      : undefined,
  };
}

export function skipShanghaiIfNeeded(
  conf: HardhatUserConfig
): HardhatUserConfig {
  if (!conf.solidity) {
    return conf;
  }
  const args = parseArgs();
  if (
    conf.networks &&
    conf.networks[args.network] &&
    conf.networks[args.network]
  ) {
    const n = conf.networks[args.network] as {dontSupportShanghai: boolean};
    if (n.dontSupportShanghai) {
      let s: MultiSolcUserConfig;
      if (typeof conf.solidity === 'string') {
        s = {compilers: [{version: conf.solidity}]};
      } else if ('version' in conf.solidity) {
        s = {compilers: [conf.solidity]};
      } else if ('compilers' in conf.solidity) {
        s = conf.solidity;
      }
      return {
        ...conf,
        solidity: {
          ...s,
          compilers: s.compilers.map((x) => ({
            version: x.version,
            settings: {
              ...x.settings,
              ...(x.version.localeCompare('0.8.18', undefined, {
                numeric: true,
              }) >= 0
                ? {evmVersion: 'paris'}
                : {}),
            },
          })),
        },
      };
    }
  }
  return conf;
}
