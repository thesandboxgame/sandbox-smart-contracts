// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC1155/ERC1155.sol";

contract MockPolygonAsset is ERC1155 {
    constructor() ERC1155("https://polygon-api.sandbox.land/api/asset/{id}.json") {}
}