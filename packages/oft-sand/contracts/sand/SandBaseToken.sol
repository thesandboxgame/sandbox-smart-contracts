// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {ERC20BasicApproveExtension} from "./ERC20BasicApproveExtension.sol";
import {ERC20BaseToken} from "./ERC20BaseToken.sol";

contract SandBaseToken is ERC20BaseToken, ERC20BasicApproveExtension {
    constructor(
        address sandAdmin,
        address executionAdmin,
        address beneficiary,
        uint256 amount
    ) ERC20BaseToken("SAND", "SAND", sandAdmin, executionAdmin) {
        _admin = sandAdmin;
        if (beneficiary != address(0)) {
            uint256 initialSupply = amount * (1 ether);
            _mint(beneficiary, initialSupply);
        }
    }
}
