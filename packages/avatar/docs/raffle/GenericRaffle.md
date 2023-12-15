# Audience

Documentation is oriented for auditors, internal developers and external developer contributors.


# Description

Writing a generic raffle Smart Contract with minimal ERC721 features / using an existing trustworthy baseline to minimize the risks as we don't plan on auditing the smart contract for each collection launch when possible. 

The regular raffle flow includes following phases:
- whitelist sale
- public sale
- reveal

Deployment:
- Write smart contract and deployment scripts
- Deploy to testnet (Mumbai)
- Setup on OpenSea (testnet)
- Provide deployment instructions for Polygon
- Provide setup instructions for opensea (Polygon)


Collection made with this and released by Sandbox are under [THE SANDBOX PREMIUM NFT TERMS OF USE](https://www.sandbox.game/en/premium-nft-terms-of-use/) and commercial intent.

The contract is [OpenSea royalty compliant ](https://thesandboxgame.notion.site/Sandbox-s-OpenSea-Operator-Filter-Registry-Implementation-3338f625dc4b4a4b9f07f925d680842d) subsequently, all extending contracts are also compliant.

# Functions

Contract functions should respect [order-of-functions solidity style guide](https://docs.soliditylang.org/en/v0.8.17/style-guide.html#order-of-functions)

----

```Solidity
constructor() {
    _disableInitializers();
}
```
* contract constructor
* mitigates a possible Implementation contract takeover, as indicate by https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract

----

```Solidity
function __GenericRaffle_init(
    string memory baseURI,
    string memory _name,
    string memory _symbol,
    address payable _sandOwner,
    address _signAddress,
    address _trustedForwarder,
    address _registry,
    address _operatorFiltererSubscription,
    bool _operatorFiltererSubscriptionSubscribe,
    uint256 _maxSupply
) internal onlyInitializing
```

 * initialization function in accordance with the upgradable pattern
 * calls all the init functions from the base classes. Emits `ContractInitialized` event
 * `baseURI`: an URI that will be used as the base for token URI
 * `_name`: name of the ERC721 token
 * `_symbol`: token symbol of the ERC721 token
 * `_sandOwner`: address belonging to SAND token owner
 * `_signAddress`: signer address that is allowed to mint
 * `_trustedForwarder`: trusted forwarder address
 * `_registry`: filter registry to which to register with. For blocking operators that do not respect royalties
 * `_operatorFiltererSubscription`: subscription address to use as a template for
 * `_operatorFiltererSubscriptionSubscribe`: if to subscribe tot the operatorFiltererSubscription address or just copy entries from it
 * `_maxSupply`: max supply of tokens to be allowed to be minted per contract
----

```Solidity
function setupWave(
    uint256 _waveMaxTokens,
    uint256 _waveMaxTokensToBuy,
    uint256 _waveSingleTokenPrice
) external onlyOwner
```

 * function to setup wave parameters. A wave is defined as a combination of allowed number tokens to be minted in total, per wallet and minting price
 * emits `WaveSetup` event
 * `_waveMaxTokens`: the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
 * `_waveMaxTokensToBuy`: max tokens to buy, per wallet in a given wave
 * `_waveSingleTokenPrice`: the price to mint a token in a given wave. In SAND wei

*Other observation*

- `mapping(address => uint256) internal waveOwnerToClaimedCounts` - should be reset with each wave start, keeps track of how many tokens were claimed in a wave by a particular wallet
- The operation should fail unless the sale wave is not paused
- The operation should fail if `waveMaxTokens` is larger than the available supply
- Should reset `waveOwnerToClaimedCounts`

----
```Solidity
function mint(
    address _wallet,
    uint256 _amount,
    uint256 _signatureId,
    bytes memory _signature
) external nonReentrant
```
 * token minting function. Price is set by wave and is paid in SAND tokens
 * `_wallet`: minting wallet
 * `_amount`: number of token to mint
 * `_signatureId`: signing signature ID
 * `_signature`: signing signature value

*Other observations*
- Custom mint operation similar to [Cyberkonz VX](https://etherscan.io/address/0x7ea3cca10668b8346aec0bf1844a49e995527c8b#code) - with fixed price plus limit check on the amount of tokens to mint
- The amount of tokens is randomly chosen out of the remaining pool of tokens
- Supports other Tokens for minting (we are using SAND)
- Should fail if:
  - `paused == true`
  - the wave max number of tokens limit has been reached or if the total number of tokens in collection has been reached
  - the amount is bigger than `waveMaxTokensToBuy - waveOwnerToClaimedCounts[wallet]`
  - the price paid is not equal to the `amount * waveSingleTokenPrice`

----
```Solidity
function toggleSale() external onlyOwner
```
 * pause or unpause the contract. Emits the `SaleToggled` event

----
```Solidity
function personalize(
    uint256 _signatureId,
    bytes memory _signature,
    uint256 _tokenId,
    uint256 _personalizationMask
) external
```

 * personalize token traits
 * after checks, it is reduced to `personalizationTraits[_tokenId] = _personalizationMask`; emits `Personalized` event
 * `_signatureId`: the ID of the provided signature
 * `_signature`: signing signature
 * `_tokenId`: what token to personalize
 * `_personalizationMask`: a mask where each bit has a custom meaning in-game

*Other observations*
- Personalization adds an extra phase for tweaking a few metadata fields before reveal
- `personalize` stores into a `map(tokenId x bitmap personalizationMask)` the personalization information, if the wallet calling the operation is the owner of the tokenId. 
- Signature is calculated similar to the current mint operation signature and includes the rest of the method parameters (walletId, tokenId, personalizationMask). 
- This operation emita a custom Event that we listen for from the backend side.
- for calculating the bitmap personalization mask
  - The formula/algorithm is specifically tweaked for the collection’s personalizable traits.
  - In a `256 uint` there can be a maximum of 32 traits personalized each with max `2^8=256` values.
  - The trait order is important to be locked, we can choose an alphabetic sorting of the traits.
- **This feature is not present/supported in most newly created Sandbox NFT collections**
----
```Solidity
function setAllowedExecuteMint(address _address) external onlyOwner
```

 * sets which address is allowed to execute the mint function. Emits `AllowedExecuteMintSet` event
 * sets `allowedToExecuteMint = _address`; address can't be 0
 * `_address`: the address that will be allowed to set execute the mint function
----
```Solidity
function setSandOwnerAddress(address _owner) external onlyOwner
```

 * saving locally the SAND token owner. Emits `SandOwnerSet` event
 * just sets `sandOwner = _owner`
 * `_owner`: new owner address to be saved
----

```Solidity
function setSignAddress(address _signAddress) external onlyOwner
```

 * sets the sign address. Emits `SignAddressSet` event
 * sets `signAddress = _signAddress`; address can't be 0
 * `_signAddress`: new signer address to be set
----

```Solidity
function personalizationOf(uint256 _tokenId) external view returns (uint256)
```

 * get the personalization of the indicated tokenID
 * returns `personalizationTraits[_tokenId]`
 * `_tokenId`: the token ID to check
 * returns the personalization data as `uint256`

----
```Solidity
function checkMintAllowed(address _wallet, uint256 _amount) external view returns (bool)
```
 * check if the indicated wallet can mint the indicated amount
 * `_wallet`: wallet to be checked if it can mint
 * `_amount`: amount to be checked if can be minted
 * returns if can mint or not

----

```Solidity
function chain() external view returns (uint256)
```

 * helper automation function
 * returns block.chainid
 * returns uint256 current chainID for the blockchain

----
```Solidity
function setBaseURI(string memory baseURI) public onlyOwner
```

 * sets the base token URI for the contract. Emits a `BaseURISet` event.
 * sets `baseTokenURI = baseURI`
 * `baseURI`: an URI that will be used as the base for token URI

----

```Solidity
function renounceOwnership() public virtual override onlyOwner
```

 * function renounces ownership of contract. Currently it is disable, as to not risk loosing mint funds
 * reverts on call

----
```Solidity
function setApprovalForAll(address operator, bool approved)
    public
    override(ERC721Upgradeable, IERC721Upgradeable)
    onlyAllowedOperatorApproval(operator)
```
 * See OpenZeppelin [IERC721-setApprovalForAll](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721.sol#L105-L115)
 * Calls super function as indicated by OpenSea registry filter logic

----
 ```Solidity
function approve(address operator, uint256 tokenId)
    public
    override(ERC721Upgradeable, IERC721Upgradeable)
    onlyAllowedOperatorApproval(operator)
```

 * See OpenZeppelin [IERC721-approve](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721.sol#L90-L103)
 * Calls super function as indicated by OpenSea registry filter logic
----
```Solidity
function transferFrom(
    address from,
    address to,
    uint256 tokenId
) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) 
```
 * See OpenZeppelin [IERC721-transferFrom](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721.sol#L72-L88)
----
```Solidity
function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) 
```

 * See OpenZeppelin [IERC721-safeTransferFrom](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721.sol#L56-L70)
* Calls super function as indicated by OpenSea registry filter logic
----
```Solidity
function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory data
) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) 
```
 * See OpenZeppelin [IERC721-safeTransferFrom](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721.sol#L41-L54)
 * Calls super function as indicated by OpenSea registry filter logic
----
```Solidity
function price(uint256 _count) public view virtual returns (uint256) 
```

 * get the price of minting the indicated number of tokens for the current wave
 * returns `waveSingleTokenPrice * _count`; Does not check if it is possible to actually mint that much
 * `_count`: the number of tokens to estimate mint price for
 * returns uint256 price of minting all the tokens
----
```Solidity
function owner() public view override(OwnableUpgradeable, UpdatableOperatorFiltererUpgradeable) returns (address) 
```
 * returns the owner of the contract (`OwnableUpgradeable.owner()`)
 * Implementation also required by the inherited parent 
----
```Solidity
function _checkSignature(
    address _wallet,
    uint256 _signatureId,
    address _contractAddress,
    uint256 _chainId,
    bytes memory _signature
) internal pure returns (address) 
```

 * validates signature
 * uses ECDSA.recover on the provided params
 * `_wallet`: wallet that was used in signature generation
 * `_signatureId`: id of signature
 * `_contractAddress`: contract address that was used in signature generation
 * `_chainId`: chain ID for which the signature was generated
 * `_signature`: signature
 * returns address that validates the provided signature
----
```Solidity
function _checkPersonalizationSignature(
    address _wallet,
    uint256 _signatureId,
    address _contractAddress,
    uint256 _chainId,
    uint256 _tokenId,
    uint256 _personalizationMask,
    bytes memory _signature
) internal pure returns (address) 
```

 * validate personalization mask
 * uses ECDSA.recover on the provided params
 * `_wallet`: wallet that was used in signature generation
 * `_signatureId`: id of signature
 * `_contractAddress`: contract address that was used in signature generation
 * `_chainId`: chain ID for which the signature was generated
 * `_tokenId`: token ID for which the signature was generated
 * `_personalizationMask`: a mask where each bit has a custom meaning in-game
 * `_signature`: signature
 * returns address that validates the provided signature
----
```Solidity
function _baseURI() internal view virtual override returns (string memory) 
```
 * get base TokenURI (returns baseTokenURI)

----
```Solidity
function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) 
```

 * ERC2771 compatible msg.data getter
 * returns `ERC2771HandlerUpgradeable._msgData()`

----
```Solidity
function _msgSender()
    internal
    view
    override(ContextUpgradeable, ERC2771HandlerUpgradeable)
    returns (address sender)
```

 * ERC2771 compatible msg.sender getter
 * returns `ERC2771HandlerUpgradeable._msgSender()`
 
----
```Solidity
function _checkWaveNotComplete(uint256 _amount) internal view returns (bool) 
```


 * check if the current wave can still mint the indicated amount
 * `_amount`: number of tokens to check if can be minted
 * returns if wave can mint the indicated amount

----
```Solidity
function _checkLimitNotReached(address _wallet, uint256 _amount) internal view returns (bool) 
```

 * checks if current contract limits are respected if minting the indicated amount
 * `_wallet`: minting wallet, whose restrictions will be considered
 * `_amount`: number of tokens to mint
 * returns if amount can be safely minted

----
```Solidity
function getRandomToken(address _wallet, uint256 _totalMinted) private returns (uint256) 
```

 * Pseudo-random number function. Good enough for our need, thx Cyberkongs VX <3!
 * standard pseudo-random implementation using keccak256 over various parameters.
 * `_wallet`: the calling account address
 * `_totalMinted`: total minted tokens up to this point
 * returns pseudo-random value
----

## Events
Events that are emitted throught the lifetime of the contract
```Solidity
event SaleToggled(bool _pause);
```

 * Event emitted when sale state was changed.
 * emitted when toggleSale is called
 * `_pause`: if the sale was was paused or not
- Internally uses: `bool private paused` to keep track of the sale wave being paused/unpaused


----
```Solidity
event Personalized(uint256 _tokenId, uint256 _personalizationMask);
```
 * Event emitted when a token personalization was made.
 * emitted when personalize is called
 * `_tokenId`: id of the token which had the personalization done
 * `_personalizationMask`: the exact personalization that was done, as a custom meaning bit-mask

----
```Solidity
event ContractInitialized(
    string baseURI,
    string _name,
    string _symbol,
    address _sandOwner,
    address _signAddress,
    uint256 _maxSupply,
    address _registry,
    address _operatorFiltererSubscription,
    bool _operatorFiltererSubscriptionSubscribe
);
```

 * Event emitted when the contract was initialized.
 * emitted at proxy startup, once only
 * `baseURI`: an URI that will be used as the base for token URI
 * `_name`: name of the ERC721 token
 * `_symbol`: token symbol of the ERC721 token
 * `_sandOwner`: address belonging to SAND token owner
 * `_signAddress`: signer address that is allowed to mint
 * `_maxSupply`: max supply of tokens to be allowed to be minted per contract
 * `_registry`: filter registry to which to register with. For blocking operators that do not respect royalties
 * `_operatorFiltererSubscription`: subscription address to use as a template for
 * `_operatorFiltererSubscriptionSubscribe`: if to subscribe tot the operatorFiltererSubscription address or just copy entries from it

----
```Solidity
event WaveSetup(uint256 _waveMaxTokens, uint256 _waveMaxTokensToBuy, uint256 _waveSingleTokenPrice);
```
 * Event emitted when a wave was set up
 * emitted when setupWave is called
 * `_waveMaxTokens`: the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
 * `_waveMaxTokensToBuy`: max tokens to buy, per wallet in a given wave
 * `_waveSingleTokenPrice`: the price to mint a token in a given wave. In SAND wei

----

```Solidity
event AllowedExecuteMintSet(address _address);
```
 * Event emitted when an address was set as allowed to mint
 * emitted when setAllowedExecuteMint is called
 * `_address`: the address that will be allowed to set execute the mint function

----
```Solidity
event SandOwnerSet(address _owner);
```

 * Event emitted when the SAND contract owner was saved
 * emitted when setSandOwnerAddress is called
 * `_owner`: new owner address to be saved
 * Event emitted when the SAND contract owner was saved
----
```Solidity
event BaseURISet(string baseURI);
```

 * Event emitted when the base token URI for the contract was set or changed
 * emitted when setBaseURI is called
 * `baseURI`: an URI that will be used as the base for token URI
----
```Solidity
event SignAddressSet(address _signAddress);
```
 * Event emitted when the signer address was set or changed
 * emitted when setSignAddress is called
 * `_signAddress`: new signer address to be set


# Links

Deployment scripts for contracts extending `GenericRaffle.sol` are found in [deploy_polygon/](../../../deploy_polygon/) (anything with `*_raffle_*` in the name).

Testing scripts are found, for each extending contract, in [test/polygon/raffle/](../../../test/polygon/raffle/) 
