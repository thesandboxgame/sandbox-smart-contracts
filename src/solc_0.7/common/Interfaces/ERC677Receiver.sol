//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

interface ERC677Receiver {
    function onTokenTransfer(
        address _sender,
        uint256 _value,
        bytes calldata _data
    ) external;
}
