pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/BytesUtil.sol";
import "../../../contracts_common/src/Libraries/SigUtil.sol";
import "../../../contracts_common/src/Interfaces/ERC1271.sol";
import "../../../contracts_common/src/Interfaces/ERC1271Constants.sol";

contract ERC20ApproveExtension is ERC1271Constants {
    mapping(address => mapping(uint256 => bool)) usedApprovalMessages;

    function approveAndCall(
        address _target,
        uint256 _amount,
        bytes memory _data
    ) public payable returns (bytes memory) {
        _approveFor(msg.sender, _target, _amount);

        // ensure the first argument is equal to msg.sender
        // allowing function being called checking the actual sender (that approved the allowance)
        // this means target should not allow call from that contract if not expecting such behavior
        // user should be carefull as usual to not approve any contract without knowing what they'll do
        require(
            BytesUtil.doFirstParamEqualsAddress(_data, msg.sender),
            "first param != sender"
        );

        (bool success, bytes memory returnData) = _target.call.value(msg.value)(
            _data
        );
        require(success, "the call failed");
        return returnData;
    }

    function approveUnlimitedAndCall(address _target, bytes calldata _data)
        external
        payable
        returns (bytes memory)
    {
        return approveAndCall(_target, 2**256 - 1, _data); // assume https://github.com/ethereum/EIPs/issues/717
    }

    function approveViaBasicSignature(
        address _from,
        uint256 _messageId,
        address _target,
        uint256 _amount,
        bytes calldata _signature,
        bool signedOnBehalf
    ) external returns (bool approved) {
        require(
            !usedApprovalMessages[_from][_messageId],
            "message already used or revoked"
        );
        bytes memory data = SigUtil.prefixed(
            keccak256(
                abi.encodePacked(
                    address(this),
                    APPROVE_TYPEHASH,
                    _from,
                    _messageId,
                    _target,
                    _amount
                )
            )
        );
        if (signedOnBehalf) {
            require(
                ERC1271(_from).isValidSignature(data, _signature) ==
                    ERC1271_MAGICVALUE,
                "invalid signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(data), _signature);
            require(signer == _from, "signer != _from");
        }
        usedApprovalMessages[_from][_messageId] = true;
        _approveFor(_from, _target, _amount);
        return true;
    }

    bytes32 constant APPROVE_TYPEHASH = keccak256(
        "Approve(address from,uint256 messageId,address target,uint256 amount)"
    );
    function approveViaSignature(
        address _from,
        uint256 _messageId,
        address _target,
        uint256 _amount,
        bytes calldata _signature,
        bool signedOnBehalf
    ) external returns (bool approved) {
        require(
            !usedApprovalMessages[_from][_messageId],
            "message already used or revoked"
        );
        bytes memory data = abi.encodePacked(
            "\x19\x01",
            domainSeparator(),
            keccak256(
                abi.encode(
                    APPROVE_TYPEHASH,
                    _from,
                    _messageId,
                    _target,
                    _amount
                )
            )
        );

        if (signedOnBehalf) {
            require(
                ERC1271(_from).isValidSignature(data, _signature) ==
                    ERC1271_MAGICVALUE,
                "invalid signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(data), _signature);
            require(signer == _from, "signer != _from");
        }
        usedApprovalMessages[_from][_messageId] = true;
        _approveFor(_from, _target, _amount);
        return true;
    }

    function revokeApprovalMessage(uint256 _messageId) external {
        usedApprovalMessages[msg.sender][_messageId] = true;
    }

    function isApprovalMessageUsed(address account, uint256 _messageId)
        external
        view
        returns (bool revoked)
    {
        return usedApprovalMessages[account][_messageId];
    }

    function _approveFor(address _owner, address _target, uint256 _amount)
        internal;

    function domainSeparator() internal view returns (bytes32);
}
