//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./interfaces/IGem.sol";
import "../common/BaseWithStorage/ERC20/ERC20UpgradableToken.sol";

contract GemV1 is IGem, ERC20UpgradableToken {
    uint16 public override gemId;

    function initialize(
        string memory name,
        string memory symbol,
        address admin,
        uint16 _gemId,
        address operator
    ) public initializer {
        initV1(name, symbol, admin, operator);
        gemId = _gemId;
    }
}
