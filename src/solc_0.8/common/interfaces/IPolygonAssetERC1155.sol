//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IAssetERC721} from "./IAssetERC721.sol";

interface IPolygonAssetERC1155 {
    function changeBouncerAdmin(address newBouncerAdmin) external;

    function setBouncer(address bouncer, bool enabled) external;

    function setPredicate(address predicate) external;

    function mint(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256 supply,
        address owner,
        bytes calldata data
    ) external returns (uint256 id);

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    function mintDeficit(
        address account,
        uint256 id,
        uint256 amount
    ) external;

    function mintMultiple(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256[] calldata supplies,
        bytes calldata rarityPack,
        address owner,
        bytes calldata data
    ) external returns (uint256[] memory ids);

    // fails on non-NFT or nft who do not have collection (was a mistake)
    function collectionOf(uint256 id) external view returns (uint256);

    function balanceOf(address owner, uint256 id) external view returns (uint256);

    // return true for Non-NFT ERC1155 tokens which exists
    function isCollection(uint256 id) external view returns (bool);

    function collectionIndexOf(uint256 id) external view returns (uint256);

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;

    function burnFrom(
        address from,
        uint256 id,
        uint256 amount
    ) external;

    function getBouncerAdmin() external view returns (address);

    function extractERC721From(
        address sender,
        uint256 id,
        address to
    ) external returns (uint256 newId);

    function isBouncer(address who) external view returns (bool);

    function creatorOf(uint256 id) external view returns (address);

    function doesHashExist(uint256 id) external view returns (bool);

    function isSuperOperator(address who) external view returns (bool);

    function isApprovedForAll(address owner, address operator) external view returns (bool isOperator);

    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) external;

    function setApprovalForAll(address operator, bool approved) external;

    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids) external returns (uint256[] memory);

    function name() external returns (string memory _name);

    function symbol() external returns (string memory _symbol);

    function supportsInterface(bytes4 id) external returns (bool);

    function uri(uint256 id) external returns (string memory);

    function setAssetERC721(IAssetERC721 assetERC721) external;

    function exists(uint256 tokenId) external view returns (bool);

    function setTrustedForwarder(address trustedForwarder) external;

    function isTrustedForwarder(address forwarder) external returns (bool);

    function getTrustedForwarder() external returns (address);

    function metadataHash(uint256 id) external returns (bytes32);
}
