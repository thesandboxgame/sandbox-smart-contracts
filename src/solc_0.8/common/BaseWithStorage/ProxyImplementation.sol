pragma solidity 0.8.2;

contract ProxyImplementation {
    mapping(string => bool) public _initialised;

    modifier phase(string memory phaseName) {
        if (!_initialised[phaseName]) {
            _initialised[phaseName] = true;
            _;
        }
    }
}
