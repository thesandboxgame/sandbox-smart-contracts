//SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import {IExchange, ExchangeMatch} from "../interfaces/IExchange.sol";
import {ICatalyst} from "../interfaces/ICatalyst.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockExchange is IExchange {
    ICatalyst public catalyst;
    IERC20 public mockErc20;

    uint256 public constant TEST_CAT_TIER = 4;
    uint256 public constant TEST_CAT_AMOUNT = 2;
    uint256 public constant TEST_CAT_PRICE = 5 ether;

    constructor(ICatalyst _catalyst, address _mockErc20) {
        catalyst = _catalyst;
        mockErc20 = IERC20(_mockErc20);
    }

    function matchOrdersFrom(address sender, ExchangeMatch[] calldata) external override {
        catalyst.mint(sender, TEST_CAT_TIER, TEST_CAT_AMOUNT);
        mockErc20.transferFrom(sender, address(this), TEST_CAT_AMOUNT * TEST_CAT_PRICE);
    }
}
