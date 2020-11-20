pragma solidity 0.5.9;

import "./contracts_common/Libraries/BytesUtil.sol";
import "./contracts_common/Libraries/AddressUtils.sol";
import "./contracts_common/Libraries/SigUtil.sol";
import "./contracts_common/Libraries/SafeMath.sol";
import "./contracts_common/Interfaces/ERC1271.sol";
import "./contracts_common/Interfaces/ERC20.sol";
import "./contracts_common/Interfaces/ERC1271Constants.sol";
import "./TheSandbox712.sol";

contract GenericMetaTransaction is TheSandbox712, ERC1271Constants {
    using SafeMath for uint256;
    using AddressUtils for address;

    bytes32 constant ERC20METATRANSACTION_TYPEHASH = keccak256(
        "ERC20MetaTransaction(address from,address to,address gasToken,bytes data,uint256 nonce,uint256 gasPrice,uint256 txGas,uint256 gasLimit,uint256 tokenGasPrice,address relayer)"
    );
    mapping(address => uint256) nonces;

    uint256 constant BASE_GAS = 112000; // TODO calculate accurately
    uint256 constant WORST_CASE_EPSILON = 10000; // TODO calculate accurately
    uint256 constant INIT_GAS = 23000; // TODO calculate accurately

    event MetaTx(bool success, bytes returnData); // TODO specify event as part of ERC-1776

    constructor() public {
        init712();
    }

    function ensureParametersValidity(
        address _from,
        address _gasToken,
        uint256[4] memory params, // _nonce, _gasPrice, _txGas, _tokenGasPrice
        address _relayer
    ) internal view {
        require(_relayer == address(0) || _relayer == msg.sender, "wrong relayer");
        require(nonces[_from] + 1 == params[0], "nonce out of order");
        require(
            ERC20(_gasToken).balanceOf(_from) >= (params[2].add(BASE_GAS)).mul(params[3]),
            "_from not enough balance"
        );
        require(tx.gasprice == params[1], "gasPrice != signer gasPrice"); // need to provide same gasPrice as requested by signer // TODO consider allowing higher value
    }

    function encodeData(
        bytes32 typeHash,
        address _from,
        address _to,
        address _gasToken,
        bytes memory _data,
        uint256[4] memory params,
        address _relayer
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    typeHash,
                    _from,
                    _to,
                    _gasToken,
                    keccak256(_data),
                    params[0],
                    params[1],
                    params[2],
                    BASE_GAS + params[2], // expect signing gasLimit = BASE_GAS + txGas
                    params[3],
                    _relayer
                )
            );
    }

    function ensureCorrectSigner(
        address _from,
        address _to,
        address _gasToken,
        bytes memory _data,
        uint256[4] memory params,
        address _relayer,
        bytes memory _sig,
        bytes32 typeHash,
        bool signedOnBehalf
    ) internal view {
        bytes memory data = abi.encodePacked(
            "\x19\x01",
            domainSeparator(),
            encodeData(typeHash, _from, _to, _gasToken, _data, params, _relayer)
        );
        if (signedOnBehalf) {
            require(ERC1271(_from).isValidSignature(data, _sig) == ERC1271_MAGICVALUE, "invalid signature");
        } else {
            address signer = SigUtil.recover(keccak256(data), _sig);
            require(signer == _from, "signer != _from");
        }
    }

    function sendERC20Tokens(
        address _from,
        address _to,
        ERC20 _tokenContract,
        uint256 _amount,
        bytes calldata _data
    ) external {
        require(msg.sender == address(this), "can only be called by own");
        _tokenContract.transferFrom(_from, _to, _amount);
        bool success = true;
        bytes memory returnData;
        if (_to.isContract() || _data.length > 0) {
            (success, returnData) = _to.call(
                abi.encodeWithSignature(
                    "erc20_tokensReceived(address,address,uint256,bytes)",
                    _from,
                    _tokenContract,
                    _amount,
                    _data
                )
            );
        }
        require(success);
    }

    // function sendERC777Tokens(address _from, address _to, ERC777 _tokenContract, uint256 _amount, bytes calldata _data) external {
    //     require(msg.sender == address(this), "can only be called by own");
    //     _tokenContract.operatorSend(_from, _to, _amount, _data);
    // }

    // TODO safe /unsafe version
    // function sendERC1155Tokens(address _from, address _to, ERC1155 _tokenContract, uint256 _tokenType, uint256 _amount, bytes calldata _data) external {
    //     require(msg.sender == address(this), "can only be called by own");
    //     _tokenContract.transfer...(_from, _to, _amount, _data);
    // }

    // TODO safe /unsafe version
    // function sendERC721Tokens(address _from, address _to, ERC721 _tokenContract, uint256 _tokenType, bytes calldata _data) external {
    //     require(msg.sender == address(this), "can only be called by own");
    //     _tokenContract.transferFrom(_from, _to, _amount, _data);
    // }

    function executeERC20MetaTx(
        address _from,
        address _to,
        address _gasToken,
        bytes calldata _data,
        uint256[4] calldata params, // _nonce, _gasPrice, _txGas, _tokenGasPrice
        address _relayer,
        bytes calldata _sig,
        address _tokenReceiver,
        bool signedOnBehalf
    ) external returns (bool, bytes memory) {
        require(msg.sender != address(this), "can only be called externaly");
        uint256 initialGas = gasleft();
        ensureParametersValidity(_from, _gasToken, params, _relayer);
        ensureCorrectSigner(
            _from,
            _to,
            _gasToken,
            _data,
            params,
            _relayer,
            _sig,
            ERC20METATRANSACTION_TYPEHASH,
            signedOnBehalf
        );
        return performERC20MetaTx(_from, _to, _gasToken, _data, params, initialGas, _tokenReceiver);
    }

    function performERC20MetaTx(
        address _from,
        address _to,
        address _gasToken,
        bytes memory _data,
        uint256[4] memory params,
        uint256 initialGas,
        address _tokenReceiver
    ) internal returns (bool, bytes memory) {
        nonces[_from] = params[0];

        bool success;
        bytes memory returnData;

        if (_to == address(this)) {
            require(BytesUtil.doFirstParamEqualsAddress(_data, _from), "first param != _from");
            uint256 gasAvailable = gasleft() - WORST_CASE_EPSILON;
            require(gasAvailable - gasAvailable / 64 > params[2], "not enough gas");
            (success, returnData) = _to.call.gas(params[2])(_data);
        } else {
            // can't accept any call since this contract willmost likely be approved by ERC20 or ERC777 contract and if those have function that
            // have such signature for example differentTransfer(uint256 amount, address from, ...) they would be vulnerable
            //so instead we define a meta_transaction hook
            uint256 gasAvailable = gasleft() - WORST_CASE_EPSILON;
            require(gasAvailable - gasAvailable / 64 > params[2], "not enough gas");
            (success, returnData) = _to.call.gas(params[2])(
                abi.encodeWithSignature("meta_transaction_received(address,bytes)", _from, _data)
            );
        }

        emit MetaTx(success, returnData);

        if (params[3] > 0) {
            uint256 gasConsumed = (initialGas + INIT_GAS) - gasleft();
            if (gasConsumed > BASE_GAS + params[2]) {
                gasConsumed = BASE_GAS + params[2];
                // idealy we would like to charge only max(BASE_GAS, gas consumed outside the inner call) + gas consumed as part of the inner call
            }
            ERC20(_gasToken).transferFrom(_from, _tokenReceiver, gasConsumed * params[3]);
        }

        return (success, returnData);
    }

    function meta_nonce(address _from) external view returns (uint256 nonce) {
        return nonces[_from];
    }
}
