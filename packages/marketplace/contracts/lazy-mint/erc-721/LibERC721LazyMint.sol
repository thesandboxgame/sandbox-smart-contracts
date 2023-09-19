// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibPart} from "../../lib-part/LibPart.sol";

/// @title library for ERC721 lazy minting
/// @notice contains struct for ERC721 mint data and hash function for said data
library LibERC721LazyMint {
    /// @notice hash identifier of ERC721 lazy asset class
    /// @return ERC721_LAZY_ASSET_CLASS identifier
    bytes4 public constant ERC721_LAZY_ASSET_CLASS = bytes4(keccak256("ERC721_LAZY"));

    struct Mint721Data {
        uint256 tokenId;
        string tokenURI;
        LibPart.Part[] creators;
        LibPart.Part[] royalties;
        bytes[] signatures;
    }

    /// @notice type hash of mint and transfer
    /// @return typehash of functions
    bytes32 public constant MINT_AND_TRANSFER_TYPEHASH =
        keccak256(
            "Mint721(uint256 tokenId,string tokenURI,Part[] creators,Part[] royalties)Part(address account,uint96 value)"
        );

    /// @notice hash function for Mint721Data
    /// @param data Mint721Data to be hashed
    /// @return bytes32 hash of data
    function hash(Mint721Data memory data) internal pure returns (bytes32) {
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
                    keccak256(bytes(data.tokenURI)),
                    keccak256(abi.encodePacked(creatorsBytes)),
                    keccak256(abi.encodePacked(royaltiesBytes))
                )
            );
    }
}
