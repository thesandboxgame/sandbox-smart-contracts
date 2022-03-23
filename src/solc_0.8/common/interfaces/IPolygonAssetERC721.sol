//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

// TODO: update interface for IAssetERC721

interface IPolygonAssetERC721 is IERC721Upgradeable {
    function mint(address to, uint256 id) external;

    function mint(
        address to,
        uint256 id,
        bytes calldata metaData
    ) external;

    function exists(uint256 tokenId) external view returns (bool);
}
