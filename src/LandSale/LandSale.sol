pragma solidity 0.5.9;

import "../Land.sol";


contract LandSale {
    Land public land;

    constructor(address landAddress) public {
        land = Land(landAddress);
    }
}
