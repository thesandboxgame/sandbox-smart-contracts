// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { OwnableUpgradeable } from "openzeppelin-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "openzeppelin-upgradeable/security/ReentrancyGuardUpgradeable.sol";


contract MockUpgradable is OwnableUpgradeable, ReentrancyGuardUpgradeable {

    string constant public VERSION = "V1";

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
