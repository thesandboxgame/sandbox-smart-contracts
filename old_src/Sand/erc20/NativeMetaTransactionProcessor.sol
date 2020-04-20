pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/BytesUtil.sol";
import "../../../contracts_common/src/Libraries/SigUtil.sol";
import "../../../contracts_common/src/Interfaces/ERC1271.sol";
import "../../../contracts_common/src/Interfaces/ERC1271Constants.sol";
import "../../../contracts_common/src/Interfaces/ERC1654.sol";
import "../../../contracts_common/src/Interfaces/ERC1654Constants.sol";
import "../../TheSandbox712.sol";

interface ExecutionableERC20 {

    function balanceOf(address who) external view returns (uint256);

    function transferFrom(address from, address to, uint256 amount) external returns(bool);

    function approveAndExecuteWithSpecificGas(
        address from,
        address to,
        uint256 amount,
        uint256 gasLimit,
        bytes calldata data
    ) external returns (bool success, bytes memory returnData);

    function approveAndExecuteWithSpecificGasAndChargeForIt(
        address from,
        address to,
        uint256 amount,
        uint256 gasLimit,
        uint256 tokenGasPrice,
        uint256 baseGasCharge,
        address tokenReceiver,
        bytes calldata data
    ) external returns (bool success, bytes memory returnData);

    function transferAndChargeForGas(
        address from,
        address to,
        uint256 amount,
        uint256 gasLimit,
        uint256 tokenGasPrice,
        uint256 baseGasCharge,
        address tokenReceiver
    ) external;
}

contract NativeMetaTransactionProcessor is ERC1654Constants, ERC1271Constants, TheSandbox712 {
    enum SignatureType { DIRECT, EIP1654, EIP1271 }

    bytes32 constant ERC20METATRANSACTION_TYPEHASH = keccak256(
        "ERC20MetaTransaction(address from,address to,uint256 amount,bytes data,uint256 nonce,uint256 minGasPrice,uint256 txGas,uint256 baseGas,uint256 tokenGasPrice,address relayer)"
    );
    mapping(address => uint256) nonces;

    event MetaTx(
        address indexed from,
        uint256 indexed nonce,
        bool success
    );

    ExecutionableERC20 _tokenContract;

    constructor(ExecutionableERC20 tokenContract) public {
        _tokenContract = tokenContract;
        init712();
    }

    /// @notice gets the current nonce (number of metatx emitted) of `from`.
    /// @param owner The address to query the nonce of.
    /// @return the current nonce
    function meta_nonce(address owner) external view returns (uint256 nonce) {
        return nonces[owner];
    }

    /// @notice perform the meta-tx using EIP-712 message.
    /// @param from address from which the meta-tx originate.
    /// @param to destination address where the call will be performed.
    /// @param amount number of tokens to be transfered/allowed as part of the call.
    /// @param data bytes to send to the destination.
    /// @param params the meta-tx parameters : nonce, minGasPrice, txGas, baseGas, tokenGasPrice.
    /// @param relayer the address allowed to perform the meta-tx.
    /// @param signature the signature that ensure from has allowed the meta-tx to be performed.
    /// @param tokenReceiver recipient of the gas charge.
    /// @param signatureType indicate whether it was signed via EOA=0, EIP-1654=1 or EIP-1271=2.
    /// @return success whether the execution was successful.
    /// @return returnData data resulting from the execution.
    function executeERC20MetaTx(
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        uint256[5] calldata params, // nonce, minGasPrice, txGas, baseGas, tokenGasPrice
        address relayer,
        bytes calldata signature,
        address tokenReceiver,
        SignatureType signatureType
    ) external returns (bool success, bytes memory returnData) {
        ensureParametersValidity(from, params, relayer);
        ensureCorrectSigner(
            from,
            to,
            amount,
            data,
            params,
            relayer,
            signature,
            ERC20METATRANSACTION_TYPEHASH,
            signatureType
        );
        return
            performERC20MetaTx(
                from,
                to,
                amount,
                data,
                params,
                tokenReceiver
            );
    }

    /// @notice perform the meta-tx using personal_sign message.
    /// @param from address from which the meta-tx originate.
    /// @param to destination address where the call will be performed.
    /// @param amount number of tokens to be transfered/allowed as part of the call.
    /// @param data bytes to send to the destination.
    /// @param params the meta-tx parameters : nonce, minGasPrice, txGas, baseGas, tokenGasPrice.
    /// @param relayer the address allowed to perform the meta-tx.
    /// @param signature the signature that ensure from has allowed the meta-tx to be performed.
    /// @param tokenReceiver recipient of the gas charge.
    /// @param signatureType indicate whether it was signed via EOA=0, EIP-1654=1 or EIP-1271=2.
    /// @return success whether the execution was successful.
    /// @return returnData data resulting from the execution.
    function executeERC20MetaTxViaBasicSignature(
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        uint256[5] calldata params, // nonce, minGasPrice, txGas, baseGas, tokenGasPrice
        address relayer,
        bytes calldata signature,
        address tokenReceiver,
        SignatureType signatureType
    ) external returns (bool, bytes memory) {
        ensureParametersValidity(from, params, relayer);
        ensureCorrectSignerViaBasicSignature(
            from,
            to,
            amount,
            data,
            params,
            relayer,
            signature,
            ERC20METATRANSACTION_TYPEHASH,
            signatureType
        );
        return
            performERC20MetaTx(
                from,
                to,
                amount,
                data,
                params,
                tokenReceiver
            );
    }

    function ensureParametersValidity(
        address from,
        uint256[5] memory params, // nonce, minGasPrice, txGas, baseGas, tokenGasPrice
        address relayer
    ) internal view {
        require(
            relayer == address(0) || relayer == msg.sender,
            "wrong relayer"
        );
        require(nonces[from] + 1 == params[0], "nonce out of order");
        require(tx.gasprice >= params[1], "gasPrice < signer minGasPrice");
    }

    function ensureCorrectSigner(
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        uint256[5] memory params, // nonce, minGasPrice, txGas, baseGas, tokenGasPrice
        address relayer,
        bytes memory signature,
        bytes32 typeHash,
        SignatureType signatureType
    ) internal view {
        bytes memory dataToHash = abi.encodePacked(
            "\x19\x01",
            domainSeparator(),
            keccak256(
                abi.encode(
                    typeHash,
                    from,
                    to,
                    amount,
                    keccak256(data),
                    params[0],
                    params[1],
                    params[2],
                    params[3],
                    params[4],
                    relayer
                )
            )
        );
        if (signatureType == SignatureType.EIP1271) {
            require(
                ERC1271(from).isValidSignature(dataToHash, signature) == ERC1271_MAGICVALUE,
                "invalid 1271 signature"
            );
        } else if(signatureType == SignatureType.EIP1654){
            require(
                ERC1654(from).isValidSignature(keccak256(dataToHash), signature) == ERC1654_MAGICVALUE,
                "invalid 1654 signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(dataToHash), signature);
            require(signer == from, "signer != from");
        }
    }

    function encodeBasicSignatureData(
        bytes32 typeHash,
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        uint256[5] memory params,
        address relayer
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    address(this),
                    typeHash,
                    from,
                    to,
                    amount,
                    keccak256(data),
                    params[0],
                    params[1],
                    params[2],
                    params[3],
                    params[4],
                    relayer
                )
            );
    }

    function ensureCorrectSignerViaBasicSignature(
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        uint256[5] memory params, // nonce, minGasPrice, txGas, baseGas, tokenGasPrice
        address relayer,
        bytes memory signature,
        bytes32 typeHash,
        SignatureType signatureType
    ) internal view {
        bytes memory dataToHash = SigUtil.prefixed(
            encodeBasicSignatureData(
                typeHash,
                from,
                to,
                amount,
                data,
                params,
                relayer
            )
        );
        if (signatureType == SignatureType.EIP1271) {
            require(
                ERC1271(from).isValidSignature(dataToHash, signature) == ERC1271_MAGICVALUE,
                "invalid 1271 signature"
            );
        } else if (signatureType == SignatureType.EIP1654) {
            require(
                ERC1654(from).isValidSignature(keccak256(dataToHash), signature) == ERC1654_MAGICVALUE,
                "invalid 1654 signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(dataToHash), signature);
            require(signer == from, "signer != from");
        }
    }

    function performERC20MetaTx(
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        uint256[5] memory params,
        address tokenReceiver
    ) internal returns (bool success, bytes memory returnData) {
        nonces[from] = params[0];

        if (data.length == 0) {
            if(params[4] > 0) {
                _tokenContract.transferAndChargeForGas(
                    from,
                    to,
                    amount,
                    params[2],
                    params[4],
                    params[3],
                    tokenReceiver
                );
            } else {
                require(_tokenContract.transferFrom(from, to, amount), "failed transfer");
            }
            success = true;
        } else {
            require(
                BytesUtil.doFirstParamEqualsAddress(data, from),
                "first param != from"
            );
            if(params[4] > 0) {
                (success, returnData) = _tokenContract.approveAndExecuteWithSpecificGasAndChargeForIt(
                    from,
                    to,
                    amount,
                    params[2],
                    params[4],
                    params[3],
                    tokenReceiver,
                    data
                );
            } else {
                (success, returnData) = _tokenContract.approveAndExecuteWithSpecificGas(from, to, amount, params[2], data);
            }
        }

        emit MetaTx(from, params[0], success);
    }
}
