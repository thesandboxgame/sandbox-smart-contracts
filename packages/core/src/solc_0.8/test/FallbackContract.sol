//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract FallBackContract {
    // solhint-disable-next-line payable-fallback
    fallback() external {}
}
