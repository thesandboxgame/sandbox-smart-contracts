//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721Base} from "./IERC721Base.sol";

interface IPolygonAssetERC721 is IERC721Base {
    function mint(address to, uint256 id) external override;

    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) external override;

    function setTokenURI(uint256 id, string memory uri) external;

    function tokenURI(uint256 id) external view returns (string memory);

    function approveFor(
        address from,
        address operator,
        uint256 id
    ) external override;

    function setApprovalForAllFor(
        address from,
        address operator,
        bool approved
    ) external override;

    function burnFrom(address from, uint256 id) external override;

    function burn(uint256 id) external override;

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external override;

    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids
    ) external override;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external override;

    function exists(uint256 tokenId) external view override returns (bool);

    function supportsInterface(bytes4 id) external view override returns (bool);

    function setTrustedForwarder(address trustedForwarder) external override;

    function isTrustedForwarder(address forwarder) external override returns (bool);

    function getTrustedForwarder() external override returns (address trustedForwarder);
}
