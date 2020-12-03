pragma solidity 0.5.9;

import "../../contracts_common/Libraries/BytesUtil.sol";

contract AssetApproveExtension {
    // will expect TheSandBox721

    mapping(address => mapping(address => uint256)) approvalMessages;
    // TODO mapping(address => mapping (uint256 => bool)) usedApprovalMessages;

    // TODO remove as we can use erc1155 totkensReceived hook
    function setApprovalForAllAndCall(address _target, bytes memory _data)
        public
        payable
        returns (bytes memory)
    {
        require(
            BytesUtil.doFirstParamEqualsAddress(_data, msg.sender),
            "first param != sender"
        );
        _setApprovalForAllFrom(msg.sender, _target, true);
        (bool success, bytes memory returnData) = _target.call.value(msg.value)(
            _data
        );
        require(success, "Something went wrong with the extra call.");
        return returnData;
    }

    function approveAllViaSignedMessage(
        address _target,
        uint256 _nonce,
        bytes calldata signature
    ) external {
        address signer; // TODO ecrecover(hash, v, r, s);
        require(approvalMessages[signer][_target]++ == _nonce);
        _setApprovalForAllFrom(signer, _target, true);
    }

    // TODO 2 signatures one for approve and one for call ?
    function approveAllAndCallViaSignedMessage(
        address _target,
        uint256 _nonce,
        bytes calldata _data,
        bytes calldata signature
    ) external payable returns (bytes memory) {
        address signer; // TODO ecrecover(hash, v, r, s);
        require(
            BytesUtil.doFirstParamEqualsAddress(_data, signer),
            "first param != signer"
        );
        require(approvalMessages[signer][_target]++ == _nonce);
        _setApprovalForAllFrom(signer, _target, true);
        (bool success, bytes memory returnData) = _target.call.value(msg.value)(
            _data
        );
        require(success, "Something went wrong with the extra call.");
        return returnData;
    }

    function _setApprovalForAllFrom(
        address owner,
        address _operator,
        bool _approved
    ) internal;

}
