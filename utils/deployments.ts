export function eth_node(networkName: string): string {
  let uri;
  if (networkName === 'mainnet') {
    uri = process.env.ETH_NODE_URI_MAINNET;
    if (uri && uri !== '') {
      return uri;
    }
  }
  uri = process.env.ETH_NODE_URI;
  if (uri) {
    uri = uri.replace('{{networkName}}', networkName);
  }
  if (!uri || uri === '') {
    // throw new Error(`environment variable "ETH_NODE_URI" not configured `);
    return '';
  }
  if (uri.indexOf('{{') >= 0) {
    throw new Error(
      `invalid uri or network not supported by nod eprovider : ${uri}`
    );
  }
  return uri;
}
