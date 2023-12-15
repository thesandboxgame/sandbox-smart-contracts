# Audience

Documentation is oriented for auditors, internal developers and external developer contributors.

# Features

`Rabbids` is the contract we used to deploy the collection **Rabbids Lunar New Year Avatars** collection under [THE SANDBOX PREMIUM NFT TERMS OF USE](https://www.sandbox.game/en/premium-nft-terms-of-use/) and commercial intent.

Functionally speaking, the contract inherits [GenericRaffle](GenericRaffle.md) and does not add anything on top of that. Roles, privileges and features are all identical to the base parent contract.

Collection max supply differs for each case. For current collection the max supply was set to `2_066` (using the `MAX_SUPPLY` constant)

When deployed, the other specific variations in the ERC721 , are provided via the upgradable `initialize` function as:
- name: *Rabbids*
- symbol: *RAB*

The contract is also [OpenSea royalty compliant ](https://thesandboxgame.notion.site/Sandbox-s-OpenSea-Operator-Filter-Registry-Implementation-3338f625dc4b4a4b9f07f925d680842d).

# Methods

Besides inherited methods (see [GenericRaffle](GenericRaffle.md) for more information on this), the contract implements the `initialize` function specific to upgradable proxy pattern:

```Solidity
   function initialize(
       string memory baseURI,
       string memory _name,
       string memory _symbol,
       address payable _sandOwner,
       address _signAddress,
       address _trustedForwarder,
       address _registry,
       address _operatorFiltererSubscription,
       bool _operatorFiltererSubscriptionSubscribe
   ) public initializer { /* <implementation> */ }
```
It passes the information to the parent `__GenericRaffle_init` function as:
```Solidity
       __GenericRaffle_init(
           baseURI,           
           _name,
           _symbol,
           _sandOwner,
           _signAddress,
           _trustedForwarder,
           _registry,
           _operatorFiltererSubscription,
           _operatorFiltererSubscriptionSubscribe,
           MAX_SUPPLY
       );
```
where:


* `baseURI` an URI that will be used as the base for token URI
* `_name` name of the ERC721 token
* `_symbol` token symbol of the ERC721 token
* `_sandOwner` address belonging to SAND token owner
* `_signAddress` signer address that is allowed to mint
* `_trustedForwarder` trusted forwarder address
* `_registry` filter registry to which to register with. For blocking operators that do not respect royalties
* `_operatorFiltererSubscription` subscription address to use as a template for
* `_operatorFiltererSubscriptionSubscribe` if to subscribe tot the operatorFiltererSubscription address or just copy entries from it
* `MAX_SUPPLY` max supply of tokens to be allowed to be minted per contract, as it was set in the contract, as a constant.


# Links

Testing related files can be found here:
- [tests](../../../test/polygon/raffle/MadBalls/)
- [deploy scripts](../../../deploy_polygon/21_raffle_madballs/)

OpenSea page: https://opensea.io/collection/rabbids-lunar-new-year-avatars

Project URL: https://www.sandbox.game/avatar-collections/rabbids-lunar-new-year-avatars/en

Contract: https://polygonscan.com/address/0xa090E057a7B3B397eFc0F3430659A05b6a41fA40
