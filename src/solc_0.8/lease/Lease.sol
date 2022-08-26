// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {ERC721} from "@openzeppelin/contracts-0.8/token/ERC721/ERC721.sol";
import {ILeaseImpl} from "./ILeaseImpl.sol";

// TODO: Maybe we can limit the agreement types ?
// TODO: we can use a fixed list of acceptable agreements.
// TODO: Check reentrancy issues when calling tokenContract and impl
/// @dev sub-lease must be implemented in the agreement if necessary
/// @dev the leaser can always freely transfer the ownership of the lease to another user
contract Lease is IERC721, ERC721 {
    struct LeaseData {
        uint256 tokenId;
        IERC721 tokenContract;
        ILeaseImpl impl;
    }

    mapping(uint256 => LeaseData) internal _agreements;

    event LeaseAgreementCreated(
        uint256 agreementId,
        IERC721 indexed tokenContract,
        uint256 indexed tokenId,
        address user,
        address owner,
        ILeaseImpl agreement
    );
    event LeaseAgreementBurned(
        uint256 agreementId,
        IERC721 indexed tokenContract,
        uint256 indexed tokenId,
        address user,
        address owner,
        ILeaseImpl agreement
    );

    // TODO: We can take the tokenContract here and make this contract specific to some NFT.
    // TODO: We can CRUD routines for agreements and so the agreements are initialized with this contract address
    /// @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    /// @notice Create a Lease between an owner and a user
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenId id of the ERC721 token being leased
    /// @param user address of the user receiving right of use
    /// @param impl Contract's address defining the rules of the lease. Only such contract is able to break the lease.
    /// @dev if `agreement` is set to the zero address, no agreement are in place and both user and owner can break the lease at any time
    function create(
        IERC721 tokenContract,
        uint256 tokenId,
        address user,
        ILeaseImpl impl
    ) external {
        require(address(tokenContract) != address(0), "invalid tokenContract");
        require(address(user) != address(0), "invalid user");
        require(address(impl) != address(0), "invalid impl");

        // TODO: it is ok to call ?
        address owner = tokenContract.ownerOf(tokenId);
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "NOT_AUTHORIZED");

        // TODO: What about same tokenContract and tokenId after burning ?.
        uint256 agreementId = _agreementId(tokenContract, tokenId);
        require(!_exists(agreementId) && address(_agreements[agreementId].impl) == address(0), "ALREADY_EXISTS");
        _agreements[agreementId] = LeaseData({tokenId: tokenId, tokenContract: tokenContract, impl: impl});
        _mint(user, agreementId);
        emit LeaseAgreementCreated(agreementId, tokenContract, tokenId, user, owner, impl);
    }

    /// @notice Destroy a specific lease. All the sub lease will also be destroyed
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenId ERC721 tokenId being leased
    function destroy(IERC721 tokenContract, uint256 tokenId) external {
        _destroy(_agreementId(tokenContract, tokenId));
    }

    /// @notice Destroy a specific lease. All the sub lease will also be destroyed
    /// @param agreementId ERC721 agreementId
    function destroy(uint256 agreementId) external {
        _destroy(agreementId);
    }

    /// @notice return the current agreement for a particular lease
    /// @param agreementId agreement token id
    function getAgreement(uint256 agreementId) external view returns (ILeaseImpl.Agreement memory) {
        LeaseData memory data = _agreements[agreementId];
        return
            ILeaseImpl.Agreement({
                impl: data.impl,
                owner: data.tokenContract.ownerOf(data.tokenId),
                user: ownerOf(agreementId)
            });
    }

    /// @notice return the current agreement for a particular tokenContract/tokenId pair
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenId ERC721 tokenId being leased
    function getAgreement(IERC721 tokenContract, uint256 tokenId) external view returns (LeaseData memory) {
        return _agreements[_agreementId(tokenContract, tokenId)];
    }

    /// @notice return whether an particular token (tokenContract/tokenId pair) is being leased
    /// @param agreementId agreement token id
    function isLeased(uint256 agreementId) external view returns (bool) {
        return _isLeased(agreementId);
    }

    /// @notice return whether an particular token (tokenContract/tokenId pair) is being leased
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenId ERC721 tokenId being leased
    function isLeased(IERC721 tokenContract, uint256 tokenId) external view returns (bool) {
        return _isLeased(_agreementId(tokenContract, tokenId));
    }

    /// @notice return the current user of a particular token (the owner of the deepest lease)
    /// The user is basically the owner of the lease of a lease of a lease (max depth = 8)
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenId ERC721 tokenId being leased
    function ownerOf(IERC721 tokenContract, uint256 tokenId) external view returns (address) {
        return ownerOf(_agreementId(tokenContract, tokenId));
    }

    /// @notice return the agreementId (tokenId of the lease) based on tokenContract/tokenId pair
    /// @param tokenContract ERC721 contract whose token is being leased
    /// @param tokenId ERC721 tokenId being leased
    function getAgreementId(IERC721 tokenContract, uint256 tokenId) external pure returns (uint256) {
        return _agreementId(tokenContract, tokenId);
    }

    // -----------------------------------------
    // Internal Functions
    // -----------------------------------------
    function _agreementId(IERC721 tokenContract, uint256 tokenId) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(tokenContract, tokenId)));
    }

    function _isLeased(uint256 agreementId) internal view returns (bool) {
        LeaseData memory data = _agreements[agreementId];
        if (address(data.impl) == address(0)) {
            return false;
        }
        return data.impl.isLeased(agreementId);
    }

    function _destroy(uint256 agreementId) internal {
        require(_exists(agreementId), "not exists");
        address user = ownerOf(agreementId);
        _burn(agreementId);
        LeaseData memory data = _agreements[agreementId];
        delete _agreements[agreementId];
        require(address(data.impl) != address(0), "invalid impl");
        require(!data.impl.isLeased(agreementId), "isLeased");
        data.impl.clean(agreementId);
        address owner = data.tokenContract.ownerOf(data.tokenId);
        require(msg.sender == owner, "only owner");
        emit LeaseAgreementBurned(agreementId, data.tokenContract, data.tokenId, user, owner, data.impl);
    }
}
