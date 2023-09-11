// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibPart} from "../../lib-part/LibPart.sol";

/// @title library for ERC1155 lazy minting
/// @notice contains struct for ERC1155 mint data and hash function for said data
library LibERC1155LazyMint {
    /// @notice hash identifier of ERC1155 lazy asset class
    /// @return ERC1155_LAZY_ASSET_CLASS identifier
    bytes4 public constant ERC1155_LAZY_ASSET_CLASS = bytes4(keccak256("ERC1155_LAZY"));

    struct Mint1155Data {
        uint256 tokenId;
        string tokenURI;
        uint256 supply;
        LibPart.Part[] creators;
        LibPart.Part[] royalties;
        bytes[] signatures;
    }

    /// @notice type hash of mint and transfer
    /// @return typehash of functions
    bytes32 public constant MINT_AND_TRANSFER_TYPEHASH =
        keccak256(
            "Mint1155(uint256 tokenId,uint256 supply,string tokenURI,Part[] creators,Part[] royalties)Part(address account,uint96 value)"
        );

    /// @notice hash function for Mint1155Data
    /// @param data Mint1155Data to be hashed
    /// @return bytes32 hash of data
    function hash(Mint1155Data memory data) internal pure returns (bytes32) {
        bytes32[] memory royaltiesBytes = new bytes32[](data.royalties.length);
        for (uint256 i = 0; i < data.royalties.length; ++i) {
            royaltiesBytes[i] = LibPart.hash(data.royalties[i]);
        }
        bytes32[] memory creatorsBytes = new bytes32[](data.creators.length);
        for (uint256 i = 0; i < data.creators.length; ++i) {
            creatorsBytes[i] = LibPart.hash(data.creators[i]);
        }
        return
            keccak256(
                abi.encode(
                    MINT_AND_TRANSFER_TYPEHASH,
                    data.tokenId,
                    data.supply,
                    keccak256(bytes(data.tokenURI)),
                    keccak256(abi.encodePacked(creatorsBytes)),
                    keccak256(abi.encodePacked(royaltiesBytes))
                )
            );
    }
}
