pragma solidity 0.6.6;

/// @notice Source: https://github.com/maticnetwork/pos-portal/blob/master/contracts/common/Initializable.sol

contract Initializable {
    bool inited = false;

    modifier initializer() {
        require(!inited, "already inited");
        _;
        inited = true;
    }
}
