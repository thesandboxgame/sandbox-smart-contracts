//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;
import "../Interfaces/ERC20Extended.sol";
import "./IRootChainManager.sol";
contract SandPolygonDepositor {
    ERC20Extended internal immutable _sand;
    address internal immutable _predicate;
    IRootChainManager internal immutable _rootChainManager;

    constructor(
        ERC20Extended sand,
        address predicate,
        IRootChainManager rootChainManager
    ) public {
        _sand = sand;
        _predicate = predicate;
        _rootChainManager = rootChainManager;
    }

    function depositToPolygon(address beneficiary, uint256 amount) public {
        _sand.transferFrom(beneficiary, address(this), amount);
        _sand.approve(_predicate, amount);
        _rootChainManager.depositFor(beneficiary, address(_sand), abi.encode(amount));
    }
}
