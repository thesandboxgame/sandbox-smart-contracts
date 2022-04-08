//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721Base} from "./IERC721Base.sol";

interface IPolygonAssetERC721 is IERC721Base {
    function mint(address to, uint256 id) external override;

    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) external override;

    function setTokenMetadata(uint256 id, bytes memory data) external;

    function tokenURI(uint256 id) external view returns (string memory);
}
