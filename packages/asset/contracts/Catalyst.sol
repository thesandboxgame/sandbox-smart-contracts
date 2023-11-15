//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {
    AccessControlUpgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {
    ERC1155BurnableUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import {
    ERC1155SupplyUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {
    ERC1155URIStorageUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    OperatorFiltererUpgradeable
} from "@sandbox-smart-contracts/dependency-operator-filter/contracts/OperatorFiltererUpgradeable.sol";
import {
    RoyaltyDistributor
} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/RoyaltyDistributor.sol";
import {
    ERC2771HandlerUpgradeable
} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {ICatalyst} from "./interfaces/ICatalyst.sol";

/// @title Catalyst
/// @author The Sandbox
/// @notice This contract manages catalysts which are used to mint new assets.
/// @dev An ERC1155 contract that manages catalysts, extends multiple OpenZeppelin contracts to
/// provide a variety of features including, AccessControl, URIStorage, Burnable and more.
/// The contract includes support for meta transactions.
contract Catalyst is
    ICatalyst,
    Initializable,
    ERC1155Upgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155URIStorageUpgradeable,
    ERC2771HandlerUpgradeable,
    AccessControlUpgradeable,
    OperatorFiltererUpgradeable,
    RoyaltyDistributor
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public highestTierIndex;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    modifier onlyValidId(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= highestTierIndex, "Catalyst: invalid catalyst id");
        _;
    }

    /// @notice Initialize the contract, setting up initial values for various features.
    /// @param _baseUri The base URI for the token metadata, most likely set to ipfs://.
    /// @param _trustedForwarder The trusted forwarder for meta transactions.
    /// @param _subscription The subscription address.
    /// @param _defaultAdmin The default admin address.
    /// @param _defaultMinter The default minter address.
    /// @param _catalystIpfsCID The IPFS content identifiers for each catalyst.
    /// @param _royaltyManager, the address of the Manager contract for common royalty recipient
    function initialize(
        string memory _baseUri,
        address _trustedForwarder,
        address _subscription,
        address _defaultAdmin,
        address _defaultMinter,
        string[] memory _catalystIpfsCID,
        address _royaltyManager
    ) external initializer {
        require(bytes(_baseUri).length != 0, "Catalyst: URI empty");
        require(_trustedForwarder != address(0), "Catalyst: 1-Zero address");
        require(_subscription != address(0), "Catalyst: 2-Zero address");
        require(_defaultAdmin != address(0), "Catalyst: 3-Zero address");
        require(_defaultMinter != address(0), "Catalyst: 4-Zero address");
        require(_royaltyManager != address(0), "Catalyst: 5-Zero address");
        __ERC1155_init(_baseUri);
        __AccessControl_init();
        __ERC1155Burnable_init();
        __ERC1155Supply_init();
        __ERC1155URIStorage_init();
        __ERC2771Handler_init(_trustedForwarder);
        __OperatorFilterer_init(_subscription, true);
        _setBaseURI(_baseUri);
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(MINTER_ROLE, _defaultMinter);
        __RoyaltyDistributor_init(_royaltyManager);
        for (uint256 i = 0; i < _catalystIpfsCID.length; i++) {
            require(bytes(_catalystIpfsCID[i]).length != 0, "Catalyst: CID cant be empty");
            _setURI(i, _catalystIpfsCID[i]);
            highestTierIndex = i;
        }
    }

    /// @notice Mints a new token, limited to MINTER_ROLE only
    /// @param to The address that will own the minted token
    /// @param id The token id to mint
    /// @param amount The amount to be minted
    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) onlyValidId(id) {
        _mint(to, id, amount, "");
    }

    /// @notice Mints a batch of tokens, limited to MINTER_ROLE only
    /// @param to The address that will own the minted tokens
    /// @param ids The token ids to mint
    /// @param amounts The amounts to be minted per token id
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] > 0 && ids[i] <= highestTierIndex, "Catalyst: invalid catalyst id");
        }
        _mintBatch(to, ids, amounts, "");
    }

    /// @notice Burns a specified amount of tokens from a specific address
    /// @param account The address to burn from
    /// @param id The token id to burn
    /// @param amount The amount to be burned
    function burnFrom(
        address account,
        uint256 id,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) {
        _burn(account, id, amount);
    }

    /// @notice Burns a batch of tokens from a specific address
    /// @param account The address to burn from
    /// @param ids The token ids to burn
    /// @param amounts The amounts to be burned
    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyRole(BURNER_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /// @notice Add a new catalyst type, limited to DEFAULT_ADMIN_ROLE only
    /// @param ipfsCID The IPFS content identifiers for the catalyst
    function addNewCatalystType(string memory ipfsCID) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(ipfsCID).length != 0, "Catalyst: CID cant be empty");
        uint256 newCatId = ++highestTierIndex;
        ERC1155URIStorageUpgradeable._setURI(newCatId, ipfsCID);
        emit NewCatalystTypeAdded(newCatId);
    }

    /// @notice Set a new trusted forwarder address, limited to DEFAULT_ADMIN_ROLE only
    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(trustedForwarder != address(0), "Catalyst: Zero address");
        _setTrustedForwarder(trustedForwarder);
    }

    /// @notice Set a new URI for specific tokenid
    /// @param tokenId The token id to set URI for
    /// @param metadataHash The new URI
    function setMetadataHash(uint256 tokenId, string memory metadataHash)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyValidId(tokenId)
    {
        require(bytes(metadataHash).length != 0, "Catalyst: Metadata hash empty");
        _setURI(tokenId, metadataHash);
    }

    /// @notice Set a new base URI
    /// @param baseURI The new base URI
    function setBaseURI(string memory baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(baseURI).length != 0, "Catalyst: URI empty");
        _setBaseURI(baseURI);
        emit BaseURISet(baseURI);
    }

    /// @notice returns full token URI, including baseURI and token metadata URI
    /// @param tokenId The token id to get URI for
    /// @return tokenURI the URI of the token
    function uri(uint256 tokenId)
        public
        view
        override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
        returns (string memory)
    {
        return ERC1155URIStorageUpgradeable.uri(tokenId);
    }

    /// @dev Needed for meta transactions (see EIP-2771)
    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    /// @dev Needed for meta transactions (see EIP-2771)
    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771HandlerUpgradeable._msgData();
    }

    /// @dev Sets `baseURI` as the `_baseURI` for all tokens
    function _setBaseURI(string memory baseURI) internal virtual override {
        super._setBaseURI(baseURI);
        emit BaseURISet(baseURI);
    }

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param value amount of token transfered.
    /// @param data additional data accompanying the transfer.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super._safeTransferFrom(from, to, id, value, data);
    }

    /// @notice Transfers `values` tokens of type `ids` from  `from` to `to` (with safety call).
    /// @dev call data should be optimized to order ids so packedBalance can be used efficiently.
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param ids ids of each token type transfered.
    /// @param values amount of each token type transfered.
    /// @param data additional data accompanying the transfer.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super._safeBatchTransferFrom(from, to, ids, values, data);
    }

    /// @notice Enable or disable approval for `operator` to manage all of the caller's tokens.
    /// @param operator address which will be granted rights to transfer all tokens of the caller.
    /// @param approved whether to approve or revoke
    function setApprovalForAll(address operator, bool approved) public override onlyAllowedOperatorApproval(operator) {
        super._setApprovalForAll(_msgSender(), operator, approved);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param interfaceId the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `interfaceId`.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable, RoyaltyDistributor)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice This function is used to register Catalyst contract on the Operator Filterer Registry of OpenSea. Can only be called by admin.
    /// @dev used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function registerAndSubscribe(address subscriptionOrRegistrantToCopy, bool subscribe)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(subscriptionOrRegistrantToCopy != address(0), "Catalyst: Zero address");
        _registerAndSubscribe(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(registry != address(0), "Catalyst: Zero address");
        OperatorFiltererUpgradeable._setOperatorFilterRegistry(registry);
        emit OperatorRegistrySet(registry);
    }

    /// @notice A descriptive name for the collection of tokens in this contract.
    /// @return _name the name of the tokens.
    function name() external pure returns (string memory _name) {
        return "The Sandbox's CATALYSTs";
    }

    /// @notice An abbreviated name for the collection of tokens in this contract.
    /// @return _symbol the symbol of the tokens.
    function symbol() external pure returns (string memory _symbol) {
        return "CATALYST";
    }

    uint256[49] private __gap;
}
