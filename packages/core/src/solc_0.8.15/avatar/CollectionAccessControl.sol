// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable-0.8.13/access/AccessControlUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable-0.8.13/access/OwnableUpgradeable.sol";


/**
 * @title CollectionAccessControl
 * @author qed.team x The Sandbox
 * @notice Access control functionality for avatar collections.
 *
 * We wanted an access control functionality that:
 *   - has owner
 *   - 2 step owner transfer
 *   - allows roles
 *   - only owner can add users to roles
 *   - transferring owner does not break the above invariants
 *
 *   Some functionality was taken directly from Ownable2StepUpgradeable:
 *   - exactly as they were:
 *       - _pendingOwner variable
 *       - OwnershipTransferStarted event
 *       - pendingOwner
 *       - transferOwnership
 *       - _transferOwnership
 *   - slightly modified
 *       - acceptOwnership
 *           - to also transfer roles before changing ownership
 *
 *   We could not inherit Ownable2StepUpgradeable directly because:
 *   - Ownable2StepUpgradeable.acceptOwnership() is not declared virtual
 */
abstract contract CollectionAccessControl is AccessControlUpgradeable, OwnableUpgradeable {

    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice identifier for the ADMIN role. This role is only given to the owner of the contract
     *         and allows for adding other addresses to the CONFIGURATOR and TRANSFORMER role
     * @dev keccak256("ADMIN_ROLE");
     */
    bytes32 public constant ADMIN_ROLE = 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775;

    /**
     * @notice identifier for the CONFIGURATOR role. Owners of this role can call configuration specific
     *         functions on the avatar contract, including setting base URI and changing minting phase
     * @dev keccak256("CONFIGURATOR_ROLE")
     */
    bytes32 public constant CONFIGURATOR_ROLE = 0x3b49a237fe2d18fa4d9642b8a0e065923cceb71b797783b619a030a61d848bf0;

    /**
     * @notice identifier for the CONFIGURATOR role. Owners of this role can personalization specific functions
     *         on the avatar contract.
     * @dev keccak256("TRANSFORMER_ROLE")
     */
    bytes32 public constant TRANSFORMER_ROLE = 0x69fc995a7cdbc94c95dc768dfaa8ceead6003727063f7d665556608319262298;

    /// @dev temporary storage variable for when saving the future-owner in a 2 step ownership transfer routine
    address private _pendingOwner;

    /*//////////////////////////////////////////////////////////////
                                Events
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice event emitted when the ownership transfer routine has been started
     * @dev emitted when calling transferOwnership
     * @param previousOwner the previous owner of the contract
     * @param newOwner the new owner of the contract
     */
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /*//////////////////////////////////////////////////////////////
                                Modifiers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice modifier used to check if the sender has been granted the specific role
     *         or if it is the owner that called
     * @param role the role to check for
     */
    modifier authorizedRole(bytes32 role) {
        address sender = _msgSender();
        require(hasRole(role, sender) || owner() == sender, "CollectionAccessControl: sender not authorized");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            Initializers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice initializes the access control logic for the collection.
     *         Sets owner as ADMIN role (only him) and gives the owner/ADMIN role admin over the
     *         other roles, CONFIGURATOR and TRANSFORMER
     * @param owner_ the owner of the contract, that will be set
     */
    function __InitializeAccessControl(address owner_) internal initializer {
        require(owner_ != address(0), "CollectionAccessControl: new owner is the zero address");

        __AccessControl_init();

        _transferOwnership(owner_);
        _grantRole(ADMIN_ROLE, owner_);

        // makes ADMIN_ROLE role holders be able to modify/configure the other roles
        _setRoleAdmin(CONFIGURATOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(TRANSFORMER_ROLE, ADMIN_ROLE);
    }

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice helper function to grant the CONFIGURATOR role to an address
     * @dev reverts if account is zero address or not called by owner
     * @param account the address that which will be given the specified role role
     */
    function addConfigurator(address account) external onlyOwner {
        require(account != address(0), "CollectionAccessControl: account is zero address");
        super.grantRole(CONFIGURATOR_ROLE, account);
    }

    /**
     * @notice helper function to revert the CONFIGURATOR role that was given to an address
     * @dev reverts if account is zero address or not called by owner
     * @param account the account address for which the role to be revoked
     */
    function revokeConfiguratorRole(address account) external onlyOwner {
        require(account != address(0), "CollectionAccessControl: account is zero address");
        super.revokeRole(CONFIGURATOR_ROLE, account);
    }

    /**
     * @notice helper function to grant the TRANSFORMER role to an address
     * @dev reverts if account is zero address or not called by owner
     * @param account the address that which will be given the specified role role
     */
    function addTransformer(address account) external onlyOwner {
        require(account != address(0), "CollectionAccessControl: account is zero address");
        super.grantRole(TRANSFORMER_ROLE, account);
    }

    /**
     * @notice helper function to revert the TRANSFORMER role that was given to an address
     * @dev reverts if account is zero address or not called by owner
     * @param account the account address for which the role to be revoked
     */
    function revokeTransformerRole(address account) external onlyOwner {
        require(account != address(0), "CollectionAccessControl: account is zero address");
        super.revokeRole(TRANSFORMER_ROLE, account);
    }

    /**
     * @notice second part of a 2 step ownership transfer routine.
     *         Also transfers the ADMIN_ROLE as there can only be 1 ADMIN_ROLE
     * @dev reverts if sender not new pending owner
     */
    function acceptOwnership() external {
        address sender = _msgSender();
        require(pendingOwner() == sender, "CollectionAccessControl: caller is not the new owner");

        super.revokeRole(ADMIN_ROLE, owner());
        super.grantRole(ADMIN_ROLE, sender);

        _transferOwnership(sender);
    }

    /**
     * @notice renounce ownership function, made to revert as a failsafe
     */
    function renounceOwnership() public virtual override onlyOwner {
        revert("CollectionAccessControl: Renounce ownership is not available");
    }

    /*//////////////////////////////////////////////////////////////
        Functions copied directly from Ownable2StepUpgradeable
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the address of the pending owner.
     */
    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    /**
     * @dev Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one.
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /*//////////////////////////////////////////////////////////////
                    Internal and private functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`) and deletes any pending owner.
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual override {
        delete _pendingOwner;
        super._transferOwnership(newOwner);
    }
}
