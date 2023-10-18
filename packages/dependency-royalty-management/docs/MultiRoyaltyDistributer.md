# MultiRoyaltyDistributer

MultiRoyaltyDistributer contract that implements the ERC-2981 and ERC-165
interfaces for a royalty payment system. Specifically, it provides functionality
for managing royalties for a collection of NFT tokens, where royalties are paid
to multiple recipients

The NFT token contract which would import this contract could deploy
RoyaltySplitter contract to split EIP2981 creatorRoyalty between the creator and
the commonRecipient in the RoyaltyManager contract. This contract would call the
RoyaltyManager contract to deploy the splitter.

The creator would have a single splitter which would receive the EIP2981 royalty
from marketplaces which distribute EIP2981 Royalty. For the market place which
distribute royalty through RoyaltyEngineV1 contract of manifolds,The royalty is
directly split and send to creator as well as the commonRecipient.

For more information on how the royalty could be distributed please read
RoyaltySplitter.md.

## External functions

---

```Solidity
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool)
```

- EIP 165 interface function called to check which interfaces are implemented on
  MultiRoyaltyDistributer contract.
- The function overrides the supportsInterface function defined in the `ERC165`
  and `IERC165` contracts. It first checks if the interfaceId matches the
  interfaceId of the `IEIP2981`, `IEIP2981MultiReceiverRoyaltyOverride` and
  `IERC165` interfaces, and returns true if there is a match.

- `interfaceId`: interfaceId to be checked for implementation

---

```Solidity
   function getTokenRoyalties()
       external
       view
       override
    returns (TokenRoyaltyConfig[] memory royaltyConfigs)
```

- This function return that returns an array which contain Token Royalty info of
  type `TokenRoyaltyConfig` struct. The royalty config would be Tokens which
  have splitter deployed for them.
- The `TokenRoyaltyConfig `struct has two fields:
- `tokenId (uint256):` the ID of the token
- `recipients` `(address[])`: an array of addresses representing the recipients
  of royalties for the token, Which has receiver Wallet and there Bps splits of
  the Royalty amount.

---

```Solidity
    function royaltyInfo(
        uint256 tokenId,
        uint256 value
    ) public view override returns (address, uint256)
```

- Gets the address of the royalty splitter and the royalty value for a given
  token.
- `tokenId`: The ID of the token for which to get royalty information.
- `value`: The Amount on which the royalty has to be calculated.
- `returns`: The address of the splitter for the token if deployed else the
  default royalty recipient and EIP2981 royalty amount.

---

```Solidity
    function getAllSplits()
        external
        view
        override
    returns (address payable[] memory splits)
```

- function used to get all the royalty recipient for Token royalty on this
  contract Based on EIP2981. It allows querying all the royalty splitter
  contracts associated with all tokens that have royalties set, as well as the
  default royalty recipient.
- `return` array of address of all the royalty splitter contracts associated
  with all tokens that have royalties set, as well as the default royalty
  recipient if it exists.

---

```Solidity
    function getRecipients(
        uint256 tokenId
    ) public view returns (Recipient[] memory)
```

- This function used to gets the royalty recipients for the given token Id, i.e
  creator wallet address and his split in Bps of total Royalty amount also
  commonRecipient on RoyaltyManager contract and his split in Bps of Total
  royalty amount. Otherwise the total default royalty receiver and
  Total_BASIS_POINTS for full split of total Royalty amount.
- `tokenId`: uint256 ID of the token to get the royalty recipients.
- `return` An array of Recipient structs representing the royalty recipients.

---

```Solidity
    function _setTokenRoyalties(
        uint256 tokenId,
        address payable recipient,
        address creator
    ) internal
```

- Sets the royalty for a given token
- `tokenId`: The ID of the token
- `recipient`: The address that will receive the royalties
- `creator`: The address of the creator of the token

---

## Events

Events that are emitted through the lifetime of the contract

---

```Solidity
    event TokenRoyaltySet(
        uint256 tokenId,
        uint16 royaltyBPS,
        address Recipient
    );
```

- Event emitted when token Royalty is set.
- emitted when \_setTokenRoyalties is called.
- `tokenId`: The id of the token.
- `royaltyBPS`: The EIP2981 royalty base points for royalty amount.
- `Recipient`: The EIP2981 recipient of the royalty

---

---

```Solidity
    event DefaultRoyaltyBpsSet(uint16 royaltyBPS);

```

- Event emitted when default Royalty Bps is set.
- emitted when \_setDefaultRoyaltyBps is called.
- `royaltyBPS`: The new default royalty base point for EIP2981 royalty.

---

---

```Solidity
    event DefaultRoyaltyReceiverSet(address recipient);

```

- Event emitted when default Royalty receiver is set.
- emitted when \_setDefaultRoyaltyReceiver is called.
- `recipient`: The new default royalty recipient for EIP2981 royalty.

---

---

```Solidity
    event RoyaltyRecipientSet(address splitter, address recipient);
```

- Event emitted when Royalty receiver for a creator is is set on there splitter.
- emitted when \_setRoyaltyRecipient is called.
- `recipient`: The new royalty recipient for the creator share of the Total
  EIP2981 royalty.

---
