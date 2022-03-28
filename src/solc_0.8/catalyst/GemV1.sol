//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./interfaces/IGem.sol";
import "../common/BaseWithStorage/ERC20/ERC20UpgradableToken.sol";

contract GemV1 is IGem, ERC20UpgradableToken {
    uint16 public override gemId;

    function __GemV1_init(
        string memory name,
        string memory symbol,
        address trustedForwarder,
        address admin,
        uint16 _gemId
    ) public initializer {
        __ERC20UpgradableToken_init(name, symbol, trustedForwarder, admin);
        gemId = _gemId;
    }
}
