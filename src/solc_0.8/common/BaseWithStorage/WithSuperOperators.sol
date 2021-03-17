//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "./WithAdmin.sol";

contract WithSuperOperators is WithAdmin {
    // @note : In an effort to both optimize the Asset contract for bytecode-size, as well as move towards a more decentralized system overall, All possible code has been removed from this contract. Storage variables have been preserved in order to not corrupt the Asset contract's storage layout during upgrades. For more info, see: https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#modifying-your-contracts

    mapping(address => bool) internal _superOperators;
}
