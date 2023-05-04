pragma solidity 0.5.9;

contract GasTest {
    uint256 constant WORST_CASE_EPSILON = 1000;

    event Tx(bool success, bytes returnData, uint256 gasUsed);

    function test(
        uint256 epsilon,
        uint256 txGas,
        address _to,
        bytes calldata _data
    ) external returns (bool success, bytes memory returnData) {
        uint256 gasAvailable = gasleft() - epsilon;
        require(gasAvailable - gasAvailable / 64 > txGas, "not enough gas");
        (success, returnData) = _to.call.gas(txGas)(_data);
        emit Tx(success, returnData, gasAvailable - gasleft());
    }

    function test(uint256 txGas, address _to, bytes calldata _data)
        external
        returns (bool success, bytes memory returnData)
    {
        uint256 gasAvailable = gasleft() - WORST_CASE_EPSILON;
        require(gasAvailable - gasAvailable / 64 > txGas, "not enough gas");
        (success, returnData) = _to.call.gas(txGas)(_data);
        emit Tx(success, returnData, gasAvailable - gasleft());
    }

    function raw(uint256 txGas, address _to, bytes calldata _data)
        external
        returns (bool success, bytes memory returnData)
    {
        uint256 gasAvailable = gasleft();
        (success, returnData) = _to.call.gas(txGas)(_data);
        emit Tx(success, returnData, gasAvailable - gasleft());
    }
}
