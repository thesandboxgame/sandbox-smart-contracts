# Audience

The intended audience for .md documentation is auditors, internal developers and external developer contributors.

# Features

This contract give rewards in any ERC20, ERC721 or ERC1155 when the backend authorize it via message signing. The
message is composed of:

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

```solidity
Signature[] calldata sigs,
uint256[] calldata claimIds,
uint256 expiration,
address from, // if different from address(this) then must be used with approve
address to,
ClaimEntry[] calldata claims
```

## Roles

- SIGNERS: This role corresponds to the addresses authorized to sign claims.
- DEFAULT_ADMIN_ROLE: This role can grant and revoke access to the other roles also it is in charge of setting the
  limits and un-pausing the contract.
- BACKOFFICE_ADMIN: Addresses in this role help the admin but with fewer privileges. They can revoke claims, pause the
  contract in the case of an emergency (but cannot unpause it).

## Limits

The contract implement some limits on the amount that can be claim at once, this doesn't protect us completely but at
least it will force the attacker to send a lot of transactions. The limits can be imposed over a certain token address
and for ERC1155 a token address plus token id.

We have the following limits:

- Number of signatures: number of backend signatures needed to approve a claim, this can be used to have a multi-sig
  structure on the backend side (default is 1).
- Max entries per claim: maximum amount of claim entries (token transferred) that can be done in one claim (default is
  1).
- Max wei per claim: maximum amount of tokens transferred for each claim entry.

## Structs info

### PerTokenLimitData

```solidity
struct PerTokenLimitData {
	uint256 maxWeiPerClaim;
}
```


### LimitData

```solidity
struct LimitData {
	uint128 numberOfSignaturesNeeded;
	uint128 maxClaimEntries;
}
```


### BatchClaimData

```solidity
struct BatchClaimData {
	SignedMultiGiveawayBase.Signature[] sigs;
	uint256[] claimIds;
	uint256 expiration;
	address from;
	address to;
	SignedMultiGiveawayBase.ClaimEntry[] claims;
}
```


## Events info

### Claimed

```solidity
event Claimed(uint256[] claimIds, address indexed from, address indexed to, SignedMultiGiveawayBase.ClaimEntry[] claims, address operator)
```


### RevokedClaims

```solidity
event RevokedClaims(uint256[] claimIds, address operator)
```


### AssetsRecovered

```solidity
event AssetsRecovered(address to, SignedMultiGiveawayBase.ClaimEntry[] claims, address operator)
```


### MaxWeiPerClaimSet

```solidity
event MaxWeiPerClaimSet(address token, uint256 tokenId, uint256 maxWeiPerClaim, address operator)
```


### NumberOfSignaturesNeededSet

```solidity
event NumberOfSignaturesNeededSet(uint256 numberOfSignaturesNeeded, address operator)
```


### MaxClaimEntriesSet

```solidity
event MaxClaimEntriesSet(uint256 maxClaimEntries, address operator)
```


## Constants info

### BACKOFFICE_ROLE (0x6406156d)

```solidity
bytes32 constant BACKOFFICE_ROLE = keccak256("BACKOFFICE_ROLE")
```

this role is for addresses that help the admin. Can pause the contract, butF, only the admin can unpause it.
## Modifiers info

### onlyAdmin

```solidity
modifier onlyAdmin()
```


### onlyBackoffice

```solidity
modifier onlyBackoffice()
```


## Functions info

### initialize (0x485cc955)

```solidity
function initialize(address trustedForwarder_, address admin_)
    external
    initializer
```


### claim (0xbec74704)

```solidity
function claim(
    SignedMultiGiveawayBase.Signature[] calldata sigs,
    uint256[] calldata claimIds,
    uint256 expiration,
    address from,
    address to,
    SignedMultiGiveawayBase.ClaimEntry[] calldata claims
) external whenNotPaused
```

verifies the ERC712 signatures and transfer tokens from the source user to the destination user.


Parameters:

| Name     | Type                                        | Description                                                      |
| :------- | :------------------------------------------ | :--------------------------------------------------------------- |
| sigs     | struct SignedMultiGiveawayBase.Signature[]  | signature part (v,r,s) the array of signatures M in N of M sigs  |
| claimIds | uint256[]                                   | unique claim ids, used by the backend to avoid double spending   |
| from     | address                                     | source user                                                      |
| to       | address                                     | destination user                                                 |
| claims   | struct SignedMultiGiveawayBase.ClaimEntry[] | list of tokens to do transfer                                    |

### batchClaim (0x4ac48bc1)

```solidity
function batchClaim(SignedMultiGiveaway.BatchClaimData[] calldata batch)
    external
    whenNotPaused
```

does a lot of claims in batch


Parameters:

| Name  | Type                                        | Description                          |
| :---- | :------------------------------------------ | :----------------------------------- |
| batch | struct SignedMultiGiveaway.BatchClaimData[] | an array of args to the claim method |

### recoverAssets (0x2bea1a5d)

```solidity
function recoverAssets(
    address to,
    SignedMultiGiveawayBase.ClaimEntry[] calldata claims
) external onlyAdmin
```

let the admin recover tokens from the contract


Parameters:

| Name   | Type                                        | Description                                |
| :----- | :------------------------------------------ | :----------------------------------------- |
| to     | address                                     | destination address of the recovered fund  |
| claims | struct SignedMultiGiveawayBase.ClaimEntry[] | list of the tokens to transfer             |

### revokeClaims (0xe5dac0d0)

```solidity
function revokeClaims(uint256[] calldata claimIds) external onlyBackoffice
```

let the admin revoke some claims so they cannot be used anymore


Parameters:

| Name     | Type      | Description                      |
| :------- | :-------- | :------------------------------- |
| claimIds | uint256[] | and array of claim Ids to revoke |

### pause (0x8456cb59)

```solidity
function pause() external onlyBackoffice
```

Triggers stopped state. No mre claims are accepted.
### unpause (0x3f4ba83a)

```solidity
function unpause() external onlyAdmin
```

Returns to the normal state. Accept claims.
### setNumberOfSignaturesNeeded (0x2ed5c3a7)

```solidity
function setNumberOfSignaturesNeeded(uint128 numberOfSignaturesNeeded)
    external
    onlyAdmin
```

set the global limits of the contract


Parameters:

| Name                     | Type    | Description                                                   |
| :----------------------- | :------ | :------------------------------------------------------------ |
| numberOfSignaturesNeeded | uint128 | number of signatures needed to approve a claim (default to 1) |

### setMaxClaimEntries (0xe0999632)

```solidity
function setMaxClaimEntries(uint128 maxClaimEntries) external onlyAdmin
```

set the global limits of the contract


Parameters:

| Name            | Type    | Description                                                                            |
| :-------------- | :------ | :------------------------------------------------------------------------------------- |
| maxClaimEntries | uint128 | maximum number of entries in a claim (amount of transfers) that can be claimed at once |

### setMaxWeiPerClaim (0x2b31cf6f)

```solidity
function setMaxWeiPerClaim(
    address token,
    uint256 tokenId,
    uint256 maxWeiPerClaim
) external onlyAdmin
```

set the limits per token and tokenId

even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm

Parameters:

| Name           | Type    | Description                                                   |
| :------------- | :------ | :------------------------------------------------------------ |
| token          | address | the token to which will assign the limit                      |
| tokenId        | uint256 | for ERC1155 is the id of the token, else it must be zero      |
| maxWeiPerClaim | uint256 | the max amount per each claim, for example 0.01eth per claim  |

### isClaimed (0x9e34070f)

```solidity
function isClaimed(uint256 claimId) external view virtual returns (bool)
```

return true if already claimed


Return values:

| Name | Type | Description     |
| :--- | :--- | :-------------- |
| [0]  | bool | true if claimed |

### verifySignature (0xe4564c5b)

```solidity
function verifySignature(
    SignedMultiGiveawayBase.Signature calldata sig,
    uint256[] calldata claimIds,
    uint256 expiration,
    address from,
    address to,
    SignedMultiGiveawayBase.ClaimEntry[] calldata claims
) external view virtual returns (address)
```

verifies a ERC712 signature for the Claim data type.


Parameters:

| Name       | Type                                        | Description                              |
| :--------- | :------------------------------------------ | :--------------------------------------- |
| sig        | struct SignedMultiGiveawayBase.Signature    | signature part (v,r,s)                   |
| claimIds   | uint256[]                                   | unique id used to avoid double spending  |
| expiration | uint256                                     | expiration timestamp                     |
| from       | address                                     | source user                              |
| to         | address                                     | destination user                         |
| claims     | struct SignedMultiGiveawayBase.ClaimEntry[] | list of tokens to do transfer            |


Return values:

| Name | Type    | Description                                          |
| :--- | :------ | :--------------------------------------------------- |
| [0]  | address | the recovered address must match the signing address |

### domainSeparator (0xf698da25)

```solidity
function domainSeparator() public view virtual returns (bytes32)
```

EIP712 domain separator


Return values:

| Name | Type    | Description                      |
| :--- | :------ | :------------------------------- |
| [0]  | bytes32 | the hash of the domain separator |

### getNumberOfSignaturesNeeded (0xdbbac9cc)

```solidity
function getNumberOfSignaturesNeeded() external view returns (uint256)
```

get the needed number of signatures to approve a claim
### getMaxClaimEntries (0x4423c4bc)

```solidity
function getMaxClaimEntries() external view returns (uint256)
```

get the maximum claim entries per claim
### getMaxWeiPerClaim (0xaa5a047d)

```solidity
function getMaxWeiPerClaim(address token, uint256 tokenId)
    external
    view
    returns (uint256)
```

get maximum Weis that can be claimed at once

even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm

Parameters:

| Name    | Type    | Description                                 |
| :------ | :------ | :------------------------------------------ |
| token   | address | the token contract address                  |
| tokenId | uint256 | inf ERC1155 the token id else must be zero  |

### supportsInterface (0x01ffc9a7)

```solidity
function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override
    returns (bool)
```

See {IERC165-supportsInterface}.
