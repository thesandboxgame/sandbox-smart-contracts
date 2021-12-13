// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./PolygonLandBaseToken.sol";
import "hardhat/console.sol";

// @todo - natspec comments

contract PolygonLand is PolygonLandBaseToken {
    address public polygonLandTunnel;

    constructor() {
        _admin = msg.sender;
    }

    function setPolygonLandTunnel(address _polygonLandTunnel) external onlyAdmin {
        polygonLandTunnel = _polygonLandTunnel;
    }

    function mint(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external {
        require(msg.sender == polygonLandTunnel, "Invalid sender");
        _mintQuad(user, size, x, y, data);
    }

    // @temp - Will remove once locking mechanism has been tested
    //
    // function exit(uint256 tokenId) public override {
    //     require(msg.sender == polygonLandTunnel, "Invalid sender");
    //     // @todo - lock
    //     uint256 storageId = _storageId(tokenId);
    //     address from = _ownerOf(tokenId);
    //     _owners[storageId] = (_owners[storageId] & NOT_OPERATOR_FLAG) | BURNED_FLAG; // record as non owner but keep track of last owner
    //     _numNFTPerAddress[from]--;
    //     emit Transfer(from, address(0), tokenId);
    // }
}
