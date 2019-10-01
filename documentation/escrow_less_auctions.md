Escrow-less Auctions
========================

See [src/Auctions/AssedSignedAuction.sol](../src/Auctions/AssedSignedAuction.sol)

While we offer a gaming experience to token owners, we also want them to be able to trade their possession as easily as possible. We are thus building a marketplace that will display all the Assets currently on sale.

In order to avoid unnecessary transaction on the blockchain we offer the possibility for sellers to post their sale offers through off-chain message. Our marketplace take care of advertising it so that potential buyers can buy these offer through a single transaction.

If Sand is used, buyers do not even need to pre-approve the Sand contract, offering the best experience possible. 
Furthermore, thanks to the native meta-transactions possibilities of Sand, users do not even need to own Ether to trade.

We also plan to offer the possibility for buyers to propose offer to Assets to yet on sale. The seller can then decide to accept the offer or not.

In both cases, if no trade actually happen, no on-chain transactions is made.


To make it work on the current state of wallets, we support both EIP-712 and Basic Signature message.

The seller that wants to sell an Asset or a pack of Asset will be requested to sign a message containing the following information
Token which will be used to pay for the Asset (0 for ETH)
Unique id for the sale, can be used to cancel it
time at which the sale start
Duration of the sale, after which it is not valid anymore
startingPrice
endingPrice
The list of ids of each Asset to sale
The list of amounts for each Asset

Our marketplace list all offer that are still valid.
For that we need to check if the token part of the sale are still in the sellers’ posession, the timing is right, …

The buyer can then make a transaction to claim it assuming it has given approval and has enough purchase tokens to make the sale
