//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../common/interfaces/polygon/IPolygonSand.sol";

contract PolygonSandBatchDeposit {
    IPolygonSand internal immutable _polygonSand;
    address internal immutable _childChainManagerProxyAddress;
    address internal _owner;

    event ChildChainManagerProxyReset(address _childChainManagerProxy);

    modifier onlyOwner() {
        require(msg.sender == _owner, "You are not authorized to perform this action");
        _;
    }

    constructor(IPolygonSand polygonSand, address childChainManagerProxyAddress) {
        _polygonSand = polygonSand;
        _childChainManagerProxyAddress = childChainManagerProxyAddress;
        _owner = msg.sender;
    }

    function batchMint(address[] calldata holders, uint256[] calldata values) external onlyOwner {
        require(holders.length == values.length, "Number of holders should be equal to number of values");
        for (uint256 i = 0; i < holders.length; i++) {
            _polygonSand.deposit(holders[i], abi.encode(values[i]));
        }
    }

    function resetChildChainManagerProxy() external onlyOwner {
        _polygonSand.updateChildChainManager(_childChainManagerProxyAddress);
        emit ChildChainManagerProxyReset(_childChainManagerProxyAddress);
    }
}
