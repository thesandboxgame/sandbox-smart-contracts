// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/access/OwnableUpgradeable.sol";
import {
    ReentrancyGuardUpgradeable
} from "@openzeppelin/contracts-upgradeable-0.8.13/security/ReentrancyGuardUpgradeable.sol";

import {ECDSA} from "@openzeppelin/contracts-0.8.15/utils/cryptography/ECDSA.sol";

contract MockUpgradable is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    string public constant VERSION = "V1";

    string public name;
    address payable public someAddress;
    address public addressTwo;
    bool public someBool;
    uint256 public maxSupply;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        string memory _name,
        address payable _someAddress,
        address _addressTwo,
        bool _someBool,
        uint256 _maxSupply
    ) public initializer {
        __Ownable_init_unchained();
        __ReentrancyGuard_init();

        name = _name;
        someAddress = _someAddress;
        addressTwo = _addressTwo;
        someBool = _someBool;
        maxSupply = _maxSupply;

        // Proxy factory is the owner and made the call, need to change it to the designated owner
        transferOwnership(_owner);
    }
}
