pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/BytesUtil.sol";
import "../../../contracts_common/src/Libraries/SigUtil.sol";
import "../../../contracts_common/src/Libraries/SafeMath.sol";
import "../../../contracts_common/src/Interfaces/ERC1271.sol";
import "../../../contracts_common/src/Interfaces/ERC1271Constants.sol";

contract ERC20MetaTxExtension is ERC1271Constants {
    using SafeMath for uint256;

    bytes32 constant ERC20METATRANSACTION_TYPEHASH = keccak256(
        "ERC20MetaTransaction(address from,address to,uint256 amount,bytes data,uint256 nonce,uint256 gasPrice,uint256 txGas,uint256 gasLimit,uint256 tokenGasPrice,address relayer)"
    );
    mapping(address => uint256) nonces;

    uint256 constant GAS_LIMIT_OFFSET = 112000;
    uint256 constant MIN_GAS = 23000 + 17500; // ~ 13000 (transfer with non-zero receiver balance) + ~ 4500 (Sent event)

    event MetaTx(
        address indexed from,
        uint256 indexed nonce,
        bool success,
        bytes returnData
    );

    function ensureParametersValidity(
        address _from,
        uint256 _amount,
        uint256[4] memory params, // _nonce, _gasPrice, _txGas, _tokenGasPrice
        address _relayer,
        uint256 initialGas
    ) internal view {
        require(
            _relayer == address(0) || _relayer == msg.sender,
            "wrong relayer"
        );
        require(nonces[_from] + 1 == params[0], "nonce out of order");
        require(
            balanceOf(_from) >=
                _amount.add((params[2].add(GAS_LIMIT_OFFSET)).mul(params[3])),
            "_from not enough balance"
        );
        require(tx.gasprice >= params[1], "gasPrice < signer gasPrice"); // need to provide at least as much gasPrice as requested by signer
    }

    function ensureCorrectSigner(
        address _from,
        address _to,
        uint256 _amount,
        bytes memory _data,
        uint256[4] memory params, // _nonce, _gasPrice, _txGas, _tokenGasPrice
        address _relayer,
        bytes memory _sig,
        bytes32 typeHash,
        bool signedOnBehalf
    ) internal view {
        bytes memory data = abi.encodePacked(
            "\x19\x01",
            domainSeparator(),
            keccak256(
                abi.encode(
                    typeHash,
                    _from,
                    _to,
                    _amount,
                    keccak256(_data),
                    params[0],
                    params[1],
                    params[2],
                    GAS_LIMIT_OFFSET.add(params[2]), // expect signing gasLimit = txGas + GAS_LIMIT_OFFSET
                    params[3],
                    _relayer
                )
            )
        );
        if (signedOnBehalf) {
            require(
                ERC1271(_from).isValidSignature(data, _sig) ==
                    ERC1271_MAGICVALUE,
                "invalid signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(data), _sig);
            require(signer == _from, "signer != _from");
        }
    }

    function encodeBasicSignatureData(
        bytes32 typeHash,
        address _from,
        address _to,
        uint256 _amount,
        bytes memory _data,
        uint256[4] memory params,
        address _relayer
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    address(this),
                    typeHash,
                    _from,
                    _to,
                    _amount,
                    keccak256(_data),
                    params[0],
                    params[1],
                    params[2],
                    GAS_LIMIT_OFFSET.add(params[2]), // expect signing gasLimit = txGas + GAS_LIMIT_OFFSET
                    params[3],
                    _relayer
                )
            );
    }

    function ensureCorrectSignerViaBasicSignature(
        address _from,
        address _to,
        uint256 _amount,
        bytes memory _data,
        uint256[4] memory params, // _nonce, _gasPrice, _txGas, _tokenGasPrice
        address _relayer,
        bytes memory _sig,
        bytes32 typeHash,
        bool signedOnBehalf
    ) internal view {
        bytes memory data = SigUtil.prefixed(
            encodeBasicSignatureData(
                typeHash,
                _from,
                _to,
                _amount,
                _data,
                params,
                _relayer
            )
        );
        if (signedOnBehalf) {
            require(
                ERC1271(_from).isValidSignature(data, _sig) ==
                    ERC1271_MAGICVALUE,
                "invalid signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(data), _sig);
            require(signer == _from, "signer != _from");
        }
    }

    function executeERC20MetaTx(
        address _from,
        address _to,
        uint256 _amount,
        bytes calldata _data,
        uint256[4] calldata params, // _nonce, _gasPrice, _txGas, _tokenGasPrice
        address _relayer,
        bytes calldata _sig,
        address _tokenReceiver,
        bool signedOnBehalf
    ) external returns (bool, bytes memory) {
        uint256 initialGas = gasleft();
        ensureParametersValidity(_from, _amount, params, _relayer, initialGas);
        ensureCorrectSigner(
            _from,
            _to,
            _amount,
            _data,
            params,
            _relayer,
            _sig,
            ERC20METATRANSACTION_TYPEHASH,
            signedOnBehalf
        );
        return
            performERC20MetaTx(
                _from,
                _to,
                _amount,
                _data,
                params,
                initialGas,
                _tokenReceiver
            );
    }

    function executeERC20MetaTxViaBasicSignature(
        address _from,
        address _to,
        uint256 _amount,
        bytes calldata _data,
        uint256[4] calldata params, // _nonce, _gasPrice, _txGas, _tokenGasPrice
        address _relayer,
        bytes calldata _sig,
        address _tokenReceiver,
        bool signedOnBehalf
    ) external returns (bool, bytes memory) {
        uint256 initialGas = gasleft();
        ensureParametersValidity(_from, _amount, params, _relayer, initialGas);
        ensureCorrectSignerViaBasicSignature(
            _from,
            _to,
            _amount,
            _data,
            params,
            _relayer,
            _sig,
            ERC20METATRANSACTION_TYPEHASH,
            signedOnBehalf
        );
        return
            performERC20MetaTx(
                _from,
                _to,
                _amount,
                _data,
                params,
                initialGas,
                _tokenReceiver
            );
    }

    function performERC20MetaTx(
        address _from,
        address _to,
        uint256 _amount,
        bytes memory _data,
        uint256[4] memory params,
        uint256 initialGas,
        address _tokenReceiver
    ) internal returns (bool, bytes memory) {
        nonces[_from] = params[0];

        bool success;
        bytes memory returnData;
        if (_data.length == 0) {
            _transfer(_from, _to, _amount);
            success = true;
        } else {
            require(
                BytesUtil.doFirstParamEqualsAddress(_data, _from),
                "first param != _from"
            );
            bool allowanceChanged = false;
            uint256 before = 0;
            if (_amount > 0 && !isSuperOperator(_to)) {
                before = allowance(_from, _to);
                if (before != 2**256 - 1) {
                    allowanceChanged = true;
                    _approveForWithoutEvent(_from, _to, _amount);
                }
            }
            (success, returnData) = _to.call.gas(params[2])(_data);
            require(gasleft() > params[2].div(63), "not enough gas left");

            if (allowanceChanged) {
                _approveForWithoutEvent(_from, _to, before);
            }
        }

        emit MetaTx(_from, params[0], success, returnData);

        if (params[3] > 0) {
            uint256 gasConsumed = (initialGas.add(MIN_GAS)).sub(gasleft());
            uint256 maxGasCharge = GAS_LIMIT_OFFSET.add(params[2]);
            if (gasConsumed > maxGasCharge) {
                gasConsumed = maxGasCharge;
                // idealy we would like to charge only max(GAS_LIMIT_OFFSET, gas consumed outside the inner call) + gas consumed as part of the inner call
            }
            _transfer(_from, _tokenReceiver, gasConsumed.mul(params[3]));
        }
        return (success, returnData);
    }

    function meta_nonce(address _from) external view returns (uint256 nonce) {
        return nonces[_from];
    }

    function isSuperOperator(address who) public view returns (bool);
    function allowance(address _owner, address _spender)
        public
        view
        returns (uint256 remaining);
    function domainSeparator() internal view returns (bytes32);
    function balanceOf(address who) public view returns (uint256);
    function _approveForWithoutEvent(
        address _owner,
        address _target,
        uint256 _amount
    ) internal;
    function _transfer(address _from, address _to, uint256 _amount) internal;
}
