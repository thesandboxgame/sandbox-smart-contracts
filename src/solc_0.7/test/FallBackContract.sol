//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

contract FallBackContract {
    // solhint-disable-next-line payable-fallback
    fallback() external {}
}
