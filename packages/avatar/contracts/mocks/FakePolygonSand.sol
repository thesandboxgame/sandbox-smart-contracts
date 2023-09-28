//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

// core/src/solc_0.8/polygon/child/sand/PolygonSand.sol 
import {PolygonSand} from "@sandbox-smart-contracts/core/src/solc_0.8/polygon/child/sand/PolygonSand.sol";

contract FakePolygonSand is PolygonSand {
    constructor(uint256 mintToDeployerAmount) PolygonSand(msg.sender, address(0), msg.sender, msg.sender) {
        _mint(msg.sender, mintToDeployerAmount * 1e18);
    }

    function donateTo(address recipient, uint256 amount) external onlyOwner {
        _mint(recipient, amount);
    }
}