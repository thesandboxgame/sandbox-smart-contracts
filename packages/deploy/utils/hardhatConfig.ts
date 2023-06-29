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
    };
  }
  return networks;
}

export function addForkingSupport(conf: HardhatUserConfig): HardhatUserConfig {
  if (!process.env.HARDHAT_FORK) {
    return conf;
  }
  return {
    ...conf,
    networks: {
      ...conf.networks,
      hardhat: {
        ...(conf.networks ? conf.networks['hardhat'] : {}),
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
