// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {
    IERC721ReceiverUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {IERC721MandatoryTokenReceiver} from "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC2771ContextUpgradeable} from "../common/BaseWithStorage/ERC2771ContextUpgradeable.sol";

/// @notice ERC721 token that supports meta-tx and access control.
/// @dev this contract implements ERC721 with: super-operator and admin roles
/// @dev and helpers to rotate the tokenId on modifications
abstract contract EstateBaseERC721 is AccessControlUpgradeable, ERC721Upgradeable, ERC2771ContextUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SUPER_OPERATOR_ROLE = keccak256("SUPER_OPERATOR_ROLE");

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

    function __EstateBaseERC721_init_unchained(address admin) internal onlyInitializing {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setTrustedForwarder(address trustedForwarder) external {
        require(hasRole(ADMIN_ROLE, _msgSender()), "not admin");
        _trustedForwarder = trustedForwarder;
    }

    /// @dev this will give the super user the power to call transferFrom, safeTransferFrom and approve for any tokenId
    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return super.isApprovedForAll(owner, operator) || hasRole(SUPER_OPERATOR_ROLE, _msgSender());
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
        // AccessControl.supportsInterface(interfaceId);
        return
            ERC721Upgradeable.supportsInterface(interfaceId) ||
            ERC165Upgradeable.supportsInterface(interfaceId) ||
            AccessControlUpgradeable.supportsInterface(interfaceId);
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
