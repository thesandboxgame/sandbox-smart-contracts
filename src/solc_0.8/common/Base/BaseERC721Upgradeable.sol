// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC2771ContextUpgradeable} from "../BaseWithStorage/ERC2771ContextUpgradeable.sol";
import {IERC721MandatoryTokenReceiver} from "../interfaces/IERC721MandatoryTokenReceiver.sol";

/// @title An ERC721 token that supports meta-tx and access control.
abstract contract BaseERC721Upgradeable is AccessControlUpgradeable, ERC721Upgradeable, ERC2771ContextUpgradeable {
    using AddressUpgradeable for address;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SUPER_OPERATOR_ROLE = keccak256("SUPER_OPERATOR_ROLE");

    /// @notice initialization
    /// @param trustedForwarder address of the meta tx trustedForwarder
    /// @param admin initial admin role that can grant or revoke other roles
    /// @param name_ name of the token
    /// @param symbol_ symbol of the token
    function __EstateBaseERC721_init(
        address trustedForwarder,
        address admin,
        string memory name_,
        string memory symbol_
    ) internal onlyInitializing {
        __ERC2771Context_init_unchained(trustedForwarder);
        __ERC721_init_unchained(name_, symbol_);
        __EstateBaseERC721_init_unchained(admin);
    }

    /// @notice initialization unchained
    /// @param admin initial admin role that can grant or revoke other roles
    function __EstateBaseERC721_init_unchained(address admin) internal onlyInitializing {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice transfer tokens in batch
    /// @param from source address
    /// @param to destination address
    /// @param tokenIds list of token ids
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata tokenIds
    ) public virtual {
        uint256 len = tokenIds.length;
        for (uint256 i; i < len; i++) {
            transferFrom(from, to, tokenIds[i]);
        }
    }

    /// @notice transfer tokens in batch
    /// @dev checking that the receiver is a contract and implements IERC721MandatoryTokenReceiver
    /// @param from source address
    /// @param to destination address
    /// @param tokenIds list of token ids
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata tokenIds
    ) public virtual {
        safeBatchTransferFrom(from, to, tokenIds, "");
    }

    /// @notice transfer tokens in batch
    /// @dev checking that the receiver is a contract and implements IERC721MandatoryTokenReceiver
    /// @param from source address
    /// @param to destination address
    /// @param tokenIds list of token ids
    /// @param _data additional data accompanying the transfer.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata tokenIds,
        bytes memory _data
    ) public virtual {
        uint256 len = tokenIds.length;
        for (uint256 i; i < len; i++) {
            safeTransferFrom(from, to, tokenIds[i], _data);
        }
    }

    /// @notice set the trusted forwarder (used by the admin in case of misconfiguration)
    /// @param trustedForwarder address of the meta tx trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external {
        require(hasRole(ADMIN_ROLE, _msgSender()), "not admin");
        _trustedForwarder = trustedForwarder;
    }

    /// @notice Returns whether `tokenId` exists.
    /// @dev Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
    /// @dev Tokens start existing when they are minted (`mint`), and stop existing when they are burned (`burn`).
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /// @notice Check if the contract supports an interface.
    /// @param interfaceId The id of the interface.
    /// @return Whether the interface is supported.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return
            ERC721Upgradeable.supportsInterface(interfaceId) || AccessControlUpgradeable.supportsInterface(interfaceId);
    }

    /// @notice Implement an ERC20 metadata method so it is easier to import the token into metamask
    /// @dev Returns the decimals places of the token, for ERC721 it is always zero.
    /// @return
    function decimals() external pure returns (uint8) {
        return 0;
    }

    /// @notice This adds a super operator role that is approved for all users and tokens
    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return hasRole(SUPER_OPERATOR_ROLE, _msgSender()) || super.isApprovedForAll(owner, operator);
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (bytes calldata) {
        return ERC2771ContextUpgradeable._msgData();
    }
}
