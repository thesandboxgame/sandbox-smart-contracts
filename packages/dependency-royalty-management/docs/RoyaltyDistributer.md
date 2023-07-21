# RoyaltyDistributer

Contract to get common royalty recipient and the EIP2981 royalties BPS from the RoyaltyManager contract.

## External functions

---

```Solidity
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool)
```

- The function overrides the supportsInterface function defined in the `ERC165` and `IERC165` contracts. It first checks if the interfaceId matches the interfaceId of the `IEIP2981` and `IERC165` interfaces, and returns true if there is a match.

- `interfaceId`: interfaceId to be checked for implementation

---

```Solidity
   function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
    returns (address receiver, uint256 royaltyAmount)
```

- This is ERC2981 royaltyInfo function.
-   `tokenId` : the id of token for which the royalty is to be calculated.
- `_salePrice` : the price of the token.
- returns `receiver` : receiver of the royalty (i.e. common recipient from RoyaltyManager)
- returns `royaltyAmount` : royalty amount to be sent.

---

