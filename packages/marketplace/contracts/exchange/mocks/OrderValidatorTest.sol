// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {OrderValidator, LibOrder} from "../OrderValidator.sol";

contract OrderValidatorTest is OrderValidator {
    function __OrderValidatorTest_init(bool _tsbOnly, bool _partners, bool _open, bool _erc20) external initializer {
        __OrderValidator_init_unchained(_tsbOnly, _partners, _open, _erc20);
    }

    function validateOrderTest(LibOrder.Order calldata order, bytes calldata signature) external view {
        return validate(order, signature, _msgSender());
    }
}
