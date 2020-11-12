pragma solidity 0.7.1;

contract FallBackContract {
    // solhint-disable-next-line payable-fallback
    fallback() external {}
}
