//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/// @title Helper library to manage the estate token Id
library EstateTokenIdHelperLib {
    uint256 internal constant SUB_ID_MULTIPLIER = uint256(2)**128;
    uint256 internal constant CHAIN_INDEX_MULTIPLIER = uint256(2)**96;

    /// @notice Increment the version field of the tokenId (the storage Id is kept unchanged).
    /// @dev Mappings to token-specific data are preserved via the storageId part that doesn't change.
    /// @param estateId The estateId to increment.
    /// @return new estate id
    function incrementVersion(uint256 estateId) internal pure returns (uint256) {
        (uint128 subId, uint32 chainIndex, uint96 version) = unpackId(estateId);
        // is it ok to roll over the version we assume the it is impossible to send 2^16 txs
        unchecked {version++;}
        return packId(subId, chainIndex, version);
    }

    /// @notice Pack a new tokenId and associate it with an owner.
    /// @param subId The main id of the token, it never changes.
    /// @param chainIndex The index of the chain, 0: mainet, 1:polygon, etc
    /// @param version The version of the token, it changes on each modification.
    /// @return the token id
    function packId(
        uint128 subId,
        uint32 chainIndex,
        uint96 version
    ) internal pure returns (uint256) {
        return subId * SUB_ID_MULTIPLIER + chainIndex * CHAIN_INDEX_MULTIPLIER + version;
    }

    /// @notice Unpack the tokenId returning the separated values.
    /// @param id The token id
    /// @return subId The main id of the token, it never changes.
    /// @return chainIndex The index of the chain, 0: mainet, 1:polygon, etc
    /// @return version The version of the token, it changes on each modification.
    function unpackId(uint256 id)
        internal
        pure
        returns (
            uint128 subId,
            uint32 chainIndex,
            uint96 version
        )
    {
        return (uint64(id / SUB_ID_MULTIPLIER), uint16(id / CHAIN_INDEX_MULTIPLIER), uint16(id));
    }

    /// @notice Return the part of the tokenId that doesn't change on modifications
    /// @param id The token id
    /// @return The storage Id (the part that doesn't change on modifications)
    function storageId(uint256 id) internal pure returns (uint256) {
        return uint256(id / CHAIN_INDEX_MULTIPLIER) * CHAIN_INDEX_MULTIPLIER;
    }
}
