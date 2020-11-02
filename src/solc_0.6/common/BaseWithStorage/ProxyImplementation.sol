pragma solidity 0.6.5;


contract ProxyImplementation {
    mapping(string => bool) _initialised;

    modifier phase(string memory phaseName) {
        if (!_initialised[phaseName]) {
            _initialised[phaseName] = true;
            _;
        }
    }
}
