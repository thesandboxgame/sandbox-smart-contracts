//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract SuccessAndRevertTest {
    event ResultEvent(uint256 counter);
    event ResultEvent2(uint256 counter);

    uint256 public counter;

    function success() external returns (uint256) {
        counter++;
        emit ResultEvent(counter);
        emit ResultEvent(10);
        emit ResultEvent2(counter);
        return counter;
    }

    function explode() external returns (uint256) {
        require(false, "PUM, REVERT");
        counter++;
        return counter;
    }
}
