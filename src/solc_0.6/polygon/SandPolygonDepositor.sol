//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.6.6;
import "./ERC20Extended.sol";
import "@maticnetwork/pos-portal/contracts/root/RootChainManager/IRootChainManager.sol";

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

    function depositToPolygon(uint256 amount, address beneficiary) public {
        _sand.transferFrom(beneficiary, address(this), amount);
        _sand.approve(_predicate, amount);
        _rootChainManager.depositFor(beneficiary, address(_sand), abi.encode(amount));
    }
}
