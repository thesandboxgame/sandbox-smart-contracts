//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

contract ProxyImplementation {
    mapping(string => bool) internal _initialised;

    modifier phase(string memory phaseName) {
        if (!_initialised[phaseName]) {
            _initialised[phaseName] = true;
            _;
        }
    }
}
