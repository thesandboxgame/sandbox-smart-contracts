//SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./OperatorFilter/OperatorFiltererUpgradeable.sol";
import "./RoyaltyHandler.sol";
import "./ERC2771Handler.sol";
import "./interfaces/ICatalyst.sol";

/// @title Catalyst
/// @dev A ERC1155 contract that manages catalysts, extends multiple OpenZeppelin contracts to
/// provide a variety of features including, AccessControl, URIStorage, Burnable and more.
/// The contract includes support for meta transactions.
contract Catalyst is
    ICatalyst,
    Initializable,
    ERC1155Upgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155URIStorageUpgradeable,
    ERC2771Handler,
    RoyaltyHandler,
    AccessControlUpgradeable,
    OperatorFiltererUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");

    uint256 public tokenCount;

    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);
    event NewCatalystTypeAdded(uint256 catalystId, uint256 royaltyBps);

    /// @dev Initialize the contract, setting up initial values for various features.
    /// @param _baseUri The base URI for the token metadata, most likely set to ipfs://.
    /// @param _trustedForwarder The trusted forwarder for meta transactions.
    /// @param _royaltyRecipient The recipient of the royalties.
    /// @param _subscription The subscription address.
    /// @param _defaultAdmin The default admin address.
    /// @param _defaultMinter The default minter address.
    /// @param _catalystRoyaltyBps The royalties for each catalyst.
    /// @param _catalystIpfsCID The IPFS content identifiers for each catalyst.
    function initialize(
        string memory _baseUri,
        address _trustedForwarder,
        address _royaltyRecipient,
        address _subscription,
        address _defaultAdmin,
        address _defaultMinter,
        uint256[] memory _catalystRoyaltyBps,
        string[] memory _catalystIpfsCID
    ) public initializer {
        __ERC1155_init(_baseUri);
        __AccessControl_init();
        __ERC1155Burnable_init();
        __ERC1155Supply_init();
        __ERC1155URIStorage_init();
        ERC1155URIStorageUpgradeable._setBaseURI(_baseUri);
        __ERC2771Handler_initialize(_trustedForwarder);
        __OperatorFilterer_init(_subscription, true);
        __RoyaltyHandler_init(_royaltyRecipient);

        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(MINTER_ROLE, _defaultMinter);

        for (uint256 i = 0; i < _catalystRoyaltyBps.length; i++) {
            RoyaltyHandler.setRoyaltyBps(i + 1, _catalystRoyaltyBps[i]);
            ERC1155URIStorageUpgradeable._setURI(i + 1, _catalystIpfsCID[i]);
            unchecked {
                tokenCount++;
            }
        }
    }

    /// @notice Set a new URI for specific tokenid
    /// @param tokenId The token id to set URI for
    /// @param metadataHash The new URI
    function setMetadataHash(
        uint256 tokenId,
        string memory metadataHash
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(tokenId, metadataHash);
    }

    /// @notice Set a new base URI
    /// @param baseURI The new base URI
    function setBaseURI(
        string memory baseURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(baseURI);
    }

    /// @notice returns full token URI, including baseURI and token metadata URI
    /// @param tokenId The token id to get URI for
    /// @return tokenURI the URI of the token
    function uri(
        uint256 tokenId
    )
        public
        view
        override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
        returns (string memory)
    {
        return ERC1155URIStorageUpgradeable.uri(tokenId);
    }

    /// @notice Mints a new token, limited to MINTER_ROLE only
    /// @param to The address that will own the minted token
    /// @param id The token id to mint
    /// @param amount The amount to be minted
    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        require(id > 0 && id <= tokenCount, "INVALID_CATALYST_ID");
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
            require(ids[i] > 0 && ids[i] <= tokenCount, "INVALID_CATALYST_ID");
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
    ) external onlyRole(MINTER_ROLE) {
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
    ) external onlyRole(MINTER_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /// @notice Add a new catalyst type, limited to DEFAULT_ADMIN_ROLE only
    /// @param catalystId The catalyst id to add
    /// @param royaltyBps The royalty bps for the catalyst
    function addNewCatalystType(
        uint256 catalystId,
        uint256 royaltyBps,
        string memory ipfsCID
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenCount++;
        RoyaltyHandler.setRoyaltyBps(catalystId, royaltyBps);
        ERC1155URIStorageUpgradeable._setURI(catalystId, ipfsCID);
        emit NewCatalystTypeAdded(catalystId, royaltyBps);
    }

    /// @notice Set a new trusted forwarder address, limited to DEFAULT_ADMIN_ROLE only
    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(
        address trustedForwarder
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(trustedForwarder != address(0), "ZERO_ADDRESS");
        _trustedForwarder = trustedForwarder;
        emit TrustedForwarderChanged(trustedForwarder);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (address sender)
    {
        return ERC2771Handler._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (bytes calldata)
    {
        return ERC2771Handler._msgData();
    }

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param value amount of token transfered.
    /// @param data aditional data accompanying the transfer.
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
    /// @param data aditional data accompanying the transfer.
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
    function setApprovalForAll(
        address operator,
        bool approved
    ) public override onlyAllowedOperatorApproval(operator) {
        super._setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @notice Change the royalty recipient address, limited to DEFAULT_ADMIN_ROLE only
    /// @param newRoyaltyRecipient The new royalty recipient address
    function changeRoyaltyRecipient(
        address newRoyaltyRecipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        RoyaltyHandler.setRoyaltyRecipient(newRoyaltyRecipient);
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
    /// @return `true` if the contract implements `id`.
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
