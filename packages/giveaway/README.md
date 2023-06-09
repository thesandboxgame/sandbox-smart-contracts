# Signed Giveaways

This is a hardhat project, see [https://hardhat.org](https://hardhat.org)

The main contract gives rewards in any ERC20, ERC721 or ERC1155 when the backend authorize it via message signing.

The message is composed of:

- A list of signatures. If the contract holt too much value more than one signature is needed. Ideally the systems that
  sign must be independent.
- A list of claim ids used by the backend to avoid double spending.
- Expiration the expiration time of the message in unix timestamp. After the expiration the message cannot be used
  anymore.
- From: usually the rewards must be transferred to the contract and this value is address(this), if a strategy with
  approve and transfer is used this is the address of the source.
- To: the destination address that will get the rewards.
- Claims: A list of union structs (ClaimEntry) that include: token type (ERC20, ERC721, ERC1155, etc), token address and
  a data field that depending on the token type may have: amount, tokenId, etc.

# Usage

```shell
yarn hardhat help
yarn hardhat test
yarn hardhat coverage
REPORT_GAS=true yarn hardhat test
yarn hardhat markup
```

# Deployment

This package exports the contract source code, for deployments see: [@sandbox-smart-contract/deploy](../deploy) package.

