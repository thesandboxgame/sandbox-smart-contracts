import {HARDHAT_NETWORK_NAME} from 'hardhat/plugins';
import {HardhatUserConfig} from 'hardhat/config';
import {NetworksUserConfig} from 'hardhat/types';

export function nodeUrl(networkName: string): string {
  if (networkName) {
    const uri = process.env['ETH_NODE_URI_' + networkName.toUpperCase()];
    if (uri && uri !== '') {
      return uri;
    }
  }

  let uri = process.env.ETH_NODE_URI;
  if (uri) {
    uri = uri.replace('{{networkName}}', networkName);
  }
  if (!uri || uri === '') {
    // throw new Error(`environment variable "ETH_NODE_URI" not configured `);
    return '';
  }
  if (uri.indexOf('{{') >= 0) {
    throw new Error(
      `invalid uri or network not supported by node provider : ${uri}`
    );
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
  for (const k in networks) {
    if (k === 'localhost' || k == HARDHAT_NETWORK_NAME) continue;
    networks[k] = {
      ...networks[k],
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
  return networks;
}

export function skipDeploymentsOnLiveNetworks(
  conf: HardhatUserConfig
): HardhatUserConfig {
  // We want to run deployments on hardhat but not on live nets
  // The problem is that hardhat-deploy always run the fixtures when testing
  // maybe there is a better way to do it:
  const testingLive =
    process.argv.some((x) => x === 'test') &&
    process.argv.some((x) => x === '--network');
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
