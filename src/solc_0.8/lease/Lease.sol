// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import "./ERC721Base.sol";

contract Lease is ERC721Base {
    // -----------------------------------------
    // Storage
    // -----------------------------------------

    mapping(uint256 => address) internal _agreements;

    // -----------------------------------------
    // Events
    // -----------------------------------------

    event LeaseAgreement(
        IERC721 indexed tokenContract,
        uint256 indexed tokenID,
        address indexed user,
        address agreement
    );

    // -----------------------------------------
    // External functions
    // -----------------------------------------

    /// @notice Create a Lease between an owner and a user
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenID id of the ERC721 token being leased
    /// @param user address of the user receiving right of use
    /// @param agreement Contract's address defining the rules of the lease. Only such contract is able to break the lease.
    /// if `agreement` is set to the zero address, no agreement are in place and both user and owner can break the lease at any time
    function create(
        IERC721 tokenContract,
        uint256 tokenID,
        address user,
        address agreement
    ) external {
        address tokenOwner = tokenContract.ownerOf(tokenID);
        require(msg.sender == tokenOwner || _operatorsForAll[tokenOwner][msg.sender], "NOT_AUTHORIZED");

        uint256 lease = _leaseIDOrRevert(tokenContract, tokenID);
        address leaseOwner = _ownerOf(lease);
        require(leaseOwner == address(0), "ALREADY_EXISTS");

        _mint(user, lease);
        _agreements[lease] = agreement;
        emit LeaseAgreement(tokenContract, tokenID, user, agreement);
    }

    /// @notice Destroy a specific lease. All the sub lease will also be destroyed
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenID ERC721 tokenID being leased
    function destroy(IERC721 tokenContract, uint256 tokenID) external {
        uint256 lease = _leaseID(tokenContract, tokenID);
        address leaseOwner = _ownerOf(lease);
        require(leaseOwner != address(0), "NOT_EXISTS");
        address agreement = _agreements[lease];
        if (agreement != address(0)) {
            require(msg.sender == agreement, "NOT_AUTHORIZED_AGREEMENT");
        } else {
            address tokenOwner = tokenContract.ownerOf(tokenID);
            require(
                msg.sender == leaseOwner ||
                    _operatorsForAll[leaseOwner][msg.sender] ||
                    msg.sender == tokenOwner ||
                    _operatorsForAll[tokenOwner][msg.sender],
                "NOT_AUTHORIZED"
            );
        }
        emit LeaseAgreement(tokenContract, tokenID, address(0), address(0));
        _burn(leaseOwner, lease);

        // This recursively destroy all sub leases
        _destroySubLeases(lease);
    }

    /// @notice return the current agreement for a particular lease
    /// @param lease lease token id
    function getAgreement(uint256 lease) public view returns (address) {
        return _agreements[lease];
    }

    /// @notice return the current agreement for a particular tokenContract/tokenId pair
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenID ERC721 tokenID being leased
    function getAgreement(IERC721 tokenContract, uint256 tokenID) external view returns (address) {
        return getAgreement(_leaseIDOrRevert(tokenContract, tokenID));
    }

    /// @notice return whether an particular token (tokenContract/tokenId pair) is being leased
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenID ERC721 tokenID being leased
    function isLeased(IERC721 tokenContract, uint256 tokenID) external view returns (bool) {
        return _ownerOf(_leaseIDOrRevert(tokenContract, tokenID)) != address(0);
    }

    /// @notice return the current user of a particular token (the owner of the deepest lease)
    /// The user is basically the owner of the lease of a lease of a lease (max depth = 8)
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenID ERC721 tokenID being leased
    function currentUser(IERC721 tokenContract, uint256 tokenID) external view returns (address) {
        uint256 lease = _leaseIDOrRevert(tokenContract, tokenID);
        address leaseOwner = _ownerOf(lease);
        if (leaseOwner != address(0)) {
            // lease for this tokenContract/tokenID paire exists => get the sub-most lease recursively
            return _submostLeaseOwner(lease, leaseOwner);
        } else {
            // there is no lease for this tokenContract/tokenID pair, the user is thus the owner
            return tokenContract.ownerOf(tokenID);
        }
    }

    /// @notice return the leaseId (tokenID of the lease) based on tokenContract/tokenID pair
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenID ERC721 tokenID being leased
    function leaseID(IERC721 tokenContract, uint256 tokenID) external view returns (uint256) {
        return _leaseIDOrRevert(tokenContract, tokenID);
    }

    // -----------------------------------------
    // Internal Functions
    // -----------------------------------------

    function _leaseIDOrRevert(IERC721 tokenContract, uint256 tokenID) internal view returns (uint256 lease) {
        lease = _leaseID(tokenContract, tokenID);
        require(lease != 0, "INVALID_LEASE_MAX_DEPTH_8");
    }

    function _leaseID(IERC721 tokenContract, uint256 tokenID) internal view returns (uint256) {
        uint256 baseId =
            uint256(keccak256(abi.encodePacked(tokenContract, tokenID))) &
                0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        if (tokenContract == this) {
            uint256 depth = ((tokenID >> 253) + 1);
            if (depth >= 8) {
                return 0;
            }
            return baseId | (depth << 253);
        }
        return baseId;
    }

    function _submostLeaseOwner(uint256 lease, address lastLeaseOwner) internal view returns (address) {
        uint256 subLease = _leaseID(this, lease);
        address subLeaseOwner = _ownerOf(subLease);
        if (subLeaseOwner != address(0)) {
            return _submostLeaseOwner(subLease, subLeaseOwner);
        } else {
            return lastLeaseOwner;
        }
    }

    function _destroySubLeases(uint256 lease) internal {
        uint256 subLease = _leaseID(this, lease);
        address subLeaseOwner = _ownerOf(subLease);
        if (subLeaseOwner != address(0)) {
            emit LeaseAgreement(this, lease, address(0), address(0));
            _burn(subLeaseOwner, subLease);
            _destroySubLeases(subLease);
        }
    }
}
