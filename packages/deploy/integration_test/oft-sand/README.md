# TSB integration test for OFT contracts

This guide outlines how to test cross-chain token transactions on the deployed
`OFTAdapterForSand` and `OFTSand` contracts.

## Deployment

Deploy the OFT contracts across different networks. For example:

- `OFTAdapterOnSand` is deployed on `Ethereum` network
- `OFTSand` is deployed on `BASE` and `BSC` network

After deploying and verifying the contracts, run the setup script for the three
networks.

To execute the deployment, run : `yarn deploy --network <NETWORK> --tags <TAG>`
where:

- `NETWORK` can either be `sepolia`, `mainet`,`base`,
  `baseSepolia`,`bscMainnet`, `bscTestnet` etc
- Ensure you are using the correct EndpointV2 address from
  [LayerZero's deployed contracts and endpoint documentation](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts).
- Use the correct EID when executing setpeer() in the setup script, also from
  [LayerZero's deployed contracts and endpoint documentation](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts)

## Testing

After deploying, verifying, and running the setup scripts, test the deployed
contracts using integration tests on their respective live networks.

To test the deployment process :

- Run the integration test in the order: `ETH` -> `BASE` -> `BSC` (`Sepolia` ->
  `BaseSepolia` -> `BscTestnet` for testnet).
- To execute integration test run :
  `yarn hardhat run <SCRIPT> --network <NETWORK>` where:

- if `SCRIPT` is `integration_test/executeSendOnOFTAdapterSepolia.ts` then
  `NETWORK` should be `sepolia`
  > Run the integration script on a valid network only.
