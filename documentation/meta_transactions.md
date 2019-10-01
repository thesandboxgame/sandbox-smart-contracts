Native Meta Transaction : EIP-1776
==================================

As mentioned in the [Sand document](Sand.md), our ERC-20 implement [EIP-1776 DRAFT](https://github.com/ethereum/EIPs/issues/1776) which allow users of Externally Owned Account (EOA for short) like metamask users and most current wallet’s user, to execute actions on the ethereum network without owning Ether, the currency necessary to perform transactions on ethereum.

The way it works is as follows:

Users are requested to sign a message including the transaction data they want to execute on ethereum.

The message is sent to a relayer, that will pay the cost in gas for the transaction. The message is sent as part of the transaction.

The Native meta transaction implementation :
 ensure the relayer is paid in the Sand token in exchange, as part of the agreement contained in the message
Execute the transaction data via an inner call to the destination

While EIP-1776 allows anybody to act as a relayer, we will act as one to ensure users can start using our platform simply by owning Sand tokens.

For that our backend will be listening for meta-transaction messages and execute them on ethereum.

For that we need a hot-wallet that contains enough ether to execute all our users’ transactions.
We decided to use bitski that offer a whitelist feature and nonce-management.
