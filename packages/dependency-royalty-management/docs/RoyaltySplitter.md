# RoyaltySplitter

Implementing a clone-able and configurable royalty splitter. It allows for the
distribution of royalties from NFT sales among 2 recipients. First recipient is
the creator's wallet and the second recipient is common recipient in the
RoyaltyManager contract.

This contract calls the RoyaltyManager contract for the common recipient's
address, common recipient's split of the Royalty and creator's split of the
royalty. Just the creators wallet address is set here to send the royalty
RoyaltySplitter's owner is the RoyaltyManager contract.

## functions

```Solidity
    function initialize(
        address payable recipient,
        address manager
    ) public initializer
```

- Initializes the contract after its initial deployment by setting the recipient
  wallet address and royalty manager contract's addresses
- `recipient`: The address of the recipient of the funds
- `manager`: The address of the manager contract

---

```Solidity
    function setRecipients(
        Recipient[] calldata recipients
    ) external override onlyOwner
```

- This function used to set the recipients wallet address. but not the split.
  This is done to be in compliance with the splitter interface of manifolds.
- `recipients`: The array of recipients which should only have one recipient to
  be set.

---

```Solidity
    function getRecipients()
        external
        view
        override
    returns (Recipient[] memory)
```

- Retrieves an array of recipients of the royalties sent to this contract
- `return` An array of Recipient , each containing Recipient address and a BPS
  value representing the share of the royalties they receive in Recipient
  address.

---

```Solidity
    function splitETH() public
```

- Allows any ETH stored by the contract to be split among recipients
- Normally ETH is forwarded as it comes.
- Could only be called by the one of the recipient(creator or common recipient)

---

```Solidity
function splitERC20Tokens(IERC20 erc20Contract) public
```

- This function allows recipients to split all available ERC20 at the provided
  address between the recipients
- recipients(both creator and common) can only call this function to split all
  available tokens recipients.
- `erc20Contract`: The ERC20 token contract to split

---

## Events

```Solidity
    event ETHTransferred(address indexed account, uint256 amount)
```

- Emitted when ETH is transferred
- `account` The address of the account that transferred the ETH
- `amount` The amount of ETH transferred

---

```Solidity
    event ERC20Transferred(
        address indexed erc20Contract,
        address indexed account,
        uint256 amount
    );
```

- Emitted when an ERC20 token transfer occurs
- `erc20Contract`: The address of the ERC20 contract that emitted the event.
- `account`: The address of the account that transferred the tokens
- `amount`: The amount of tokens transferred

---
