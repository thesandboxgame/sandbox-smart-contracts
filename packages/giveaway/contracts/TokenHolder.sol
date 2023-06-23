//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.18;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ERC2771Handler} from "./ERC2771Handler.sol";
import {ERC1155HolderUpgradeable, ERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {ERC721HolderUpgradeable, IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// @title This contract give rewards in any ERC20, ERC721 or ERC1155 when the backend authorize it via message signing.
/// @dev The whole contract is split in the base one this implementation to facilitate the reading and split
/// @dev the signature checking code.
/// @dev This contract support meta transactions.
/// @dev This contract is final, don't inherit form it.
contract TokenHolder is
    PausableUpgradeable,
    ERC2771Handler,
    ERC1155HolderUpgradeable,
    ERC721HolderUpgradeable,
    AccessControlEnumerableUpgradeable,
    ReentrancyGuardUpgradeable
{
    /// @dev this is a union type, data depends on the tokenType it can be amount, amount + tokenId, etc.
    struct TransferEntry {
        address tokenAddress;
        bytes data;
    }

    /// @dev this role is for addresses that help the admin. Can pause the contract, butF, only the admin can unpause it.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @dev this role is for addresses that help the admin. Can pause the contract, butF, only the admin can unpause it.
    bytes32 public constant BACKOFFICE_ROLE = keccak256("BACKOFFICE_ROLE");

    /// @dev  Maximum amount of transfers per message minus one, 0 => 1 transfer entry per transfer
    uint256 private _maxTransferEntries;

    event Transferred(TransferEntry[] transfers, address operator);
    event AssetsRecovered(TransferEntry[] transfers, address operator);
    event MaxTransferEntriesSet(uint256 maxTransferEntries, address operator);

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "only admin");
        _;
    }

    modifier onlyBackoffice() {
        require(hasRole(BACKOFFICE_ROLE, _msgSender()), "only backoffice");
        _;
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, _msgSender()), "only operator");
        _;
    }

    function initialize(address trustedForwarder_, address admin_) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155Receiver_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
        __AccessControl_init_unchained();
        __Pausable_init_unchained();
        __ERC2771Handler_initialize(trustedForwarder_);
        __ReentrancyGuard_init_unchained();
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(BACKOFFICE_ROLE, admin_);
    }

    /// @notice verifies the ERC712 signatures and transfer tokens from the source user to the destination user.
    /// @param transfers list of tokens to do transfer
    function transfer(TransferEntry[] calldata transfers) external nonReentrant onlyOperator whenNotPaused {
        emit Transferred(transfers, _msgSender());
        _transfer(transfers);
    }

    /// @notice let the admin recover tokens from the contract
    /// @param transfers list of the tokens to transfer
    function recoverAssets(TransferEntry[] calldata transfers) external nonReentrant onlyAdmin {
        emit AssetsRecovered(transfers, _msgSender());
        _transfer(transfers);
    }

    /// @notice Triggers stopped state. No mre transfers are accepted.
    function pause() external onlyBackoffice {
        _pause();
    }

    /// @notice Returns to the normal state. Accept transfers.
    function unpause() external onlyAdmin {
        _unpause();
    }

    /// @notice set the global limits of the contract
    /// @param maxTransferEntries maximum number of entries in a transfer (amount of transfers) that can be transfered at once
    function setMaxTransferEntries(uint256 maxTransferEntries) external onlyAdmin {
        require(maxTransferEntries > 0, "invalid maxTransferEntries");
        _maxTransferEntries = maxTransferEntries - 1;
        emit MaxTransferEntriesSet(maxTransferEntries, _msgSender());
    }

    /// @notice get the maximum transfer entries per transfer
    function getMaxTransferEntries() external view returns (uint256) {
        return _maxTransferEntries + 1;
    }

    /// @dev See {IERC165-supportsInterface}.
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControlEnumerableUpgradeable, ERC1155ReceiverUpgradeable) returns (bool) {
        return (interfaceId == type(IERC721ReceiverUpgradeable).interfaceId) || super.supportsInterface(interfaceId);
    }

    function _transfer(TransferEntry[] calldata transfers) internal {
        uint256 len = transfers.length;
        require(len <= _maxTransferEntries + 1, "too many transfers");
        for (uint256 i; i < len; i++) {
            AddressUpgradeable.functionCall(transfers[i].tokenAddress, transfers[i].data);
        }
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }
}
