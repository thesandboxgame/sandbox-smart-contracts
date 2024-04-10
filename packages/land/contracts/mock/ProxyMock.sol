// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/// @dev just for testing don't use this code on production !!!!
contract ProxyMock {
    constructor(address newImplementation) {
        ERC1967Utils.upgradeToAndCall(newImplementation, "");
    }

    function _delegate(address implementation) internal virtual {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    fallback() external payable {
        _delegate(ERC1967Utils.getImplementation());
    }

    receive() external payable {
        _delegate(ERC1967Utils.getImplementation());
    }
}
