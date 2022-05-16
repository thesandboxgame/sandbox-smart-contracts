pragma solidity ^0.5.2;

contract AdminV2 {

    address internal _admin;

    event AdminChanged(address oldAdmin, address newAdmin);

    /// @notice gives the current administrator of this contract.
    /// @return the current administrator of this contract.
    function getAdmin() external view returns (address) {
        return _admin;
    }

    /// @notice change the administrator to be `newAdmin`.
    /// @param newAdmin address of the new administrator.
    function changeAdmin(address newAdmin) external {
        require(msg.sender == _admin, "only admin can change admin");
        require(newAdmin != _admin, "it can be only changed to a new admin");
        emit AdminChanged(_admin, newAdmin);
        _admin = newAdmin;
    }

    modifier onlyAdmin() {
        require (msg.sender == _admin, "only admin allowed");
        _;
    }

}
