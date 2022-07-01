//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

library EstateTokenIdHelperLib {
    uint256 internal constant CREATOR_OFFSET_MULTIPLIER = uint256(2)**96;
    uint256 internal constant STORAGE_ID_MULTIPLIER = uint256(2)**32;
    uint256 internal constant CHAIN_INDEX_MULTIPLIER = uint256(2)**16;

    /// @dev used to increment the version in a tokenId by burning the original and reminting a new token. Mappings to
    /// @dev token-specific data are preserved via the storageId mechanism.
    /// @param estateId The estateId to increment.
    /// @return new estate id
    function incrementVersion(uint256 estateId) internal pure returns (uint256) {
        (address creator, uint64 subId, uint16 chainId, uint16 version) = unpackId(estateId);
        // is it ok to roll over the version we assume the it is impossible to send 2^16 txs
        unchecked {version++;}
        return packId(creator, subId, chainId, version);
    }

    /// @dev Create a new tokenId and associate it with an owner.
    /// This is a packed id, consisting of 4 parts:
    /// the creator's address, a uint64 subId, a uint18 chainIndex and a uint16 version.
    /// @param creator The address of the Token creator.
    /// @param subId The id used to generate the id.
    /// @param version The public version used to generate the id.
    function packId(
        address creator,
        uint64 subId,
        uint16 chainId,
        uint16 version
    ) internal pure returns (uint256) {
        return
            uint256(uint160(creator)) *
            CREATOR_OFFSET_MULTIPLIER +
            subId *
            STORAGE_ID_MULTIPLIER +
            chainId *
            CHAIN_INDEX_MULTIPLIER +
            version;
    }

    function unpackId(uint256 id)
        internal
        pure
        returns (
            address creator,
            uint64 subId,
            uint16 chainId,
            uint16 version
        )
    {
        return (
            address(uint160(id / CREATOR_OFFSET_MULTIPLIER)),
            uint64(id / STORAGE_ID_MULTIPLIER),
            uint16(id / CHAIN_INDEX_MULTIPLIER),
            uint16(id)
        );
    }

    /// @dev creator + subId
    function storageId(uint256 id) internal pure returns (uint256) {
        return uint256(id / STORAGE_ID_MULTIPLIER);
    }
}
