//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract PayableMock {
    bool public called;
    bool public fallbackCalled;
    bool public receiveCalled;

    function payME() external payable {
        called = true;
    }

    function callME() external {
        called = true;
    }

    fallback() external payable {
        fallbackCalled = true;
    }

    receive() external payable {
        receiveCalled = true;
    }
}
