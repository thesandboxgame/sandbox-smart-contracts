Sand, an ERC-20 token implementation that support meta transactions natively
===============================================================

See: [src/Sand.sol](../src/Sand.sol)

Sand smart contract is the ERC-20 token that will be used for
- Trading Assets among players
- Fee for minting Assets
- Staking in our curation / moderation system
- Paying for meta-transactions
- Voting decisions

Sand implements the ERC-20 standard
It also implement a mechanism to be extended in the future.
While this introduce a centralization point, we plan to remove that possibility once the platform has all the ingredients to make it easy to use.

Through this mechanism we implements the current [EIP-1776 DRAFT](https://github.com/ethereum/EIPs/issues/1776), a proposal we put forward to standardize native meta-transactions that allow users of EOA based wallet (like metamask and most current wallets) to perform actions on ethereum without the need to own ether.
