// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import "../common/interfaces/IEstateToken.sol";
/*import "../common/interfaces/IEstateMinter.sol";
import "../common/interfaces/IFeeCollector.sol"; */
import "../common/BaseWithStorage/ERC721BaseToken.sol";
import "../common/BaseWithStorage/ERC2771Handler.sol";
import "../common/Libraries/SigUtil.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract EstateMinter is
    ERC2771Handler, /* IEstateMinter, */
    Initializable
{
    address internal _admin;
    //IFeeCollector internal _feeCollector;
    IEstateToken internal _estateToken;
    address internal _backAddress = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    uint256 internal _estateMintingFee;
    uint256 internal _estateUpdateFee;

    function initV1(
        IEstateToken estateTokenContract,
        address trustedForwarder,
        address admin,
        //IFeeCollector feeCollector, //uint8 chainIndex
        uint256 estateMintingFee,
        uint256 estateUpdateFee
    ) public initializer {
        _admin = admin;
        _estateToken = estateTokenContract;
        //_feeCollector = feeCollector;
        _estateMintingFee = estateMintingFee;
        _estateUpdateFee = estateUpdateFee;
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
    }

    function createEstate(IEstateToken.EstateCRUDData calldata creation)
        external
        returns (
            // bytes calldata signature
            uint256
        )
    {
        address msgSender = _msgSender();
        //_feeCollector.chargeSand(msgSender, _estateMintingFee);
        //_verifyAdjacencyCreate(creation, signature);
        return _estateToken.createEstate(msgSender, creation);
    }

    function updateLandsEstate(IEstateToken.UpdateEstateLands calldata update) external returns (uint256) {
        address msgSender = _msgSender();
        return _estateToken.updateLandsEstate(msgSender, update);
    }

    /* function updateEstate(
        uint256 estateId,
        IEstateToken.UpdateEstateData calldata update,
        bytes calldata signature
    ) external override returns (uint256) {
        address msgSender = _msgSender();
        //_verifyAdjacencyUpdate(estateId, update, signature);
        _feeCollector.chargeSand(msgSender, _estateUpdateFee);
        return _estateToken.updateEstate(msgSender, estateId, update, signature);
    } */

    /* function _verifyAdjacencyCreate(IEstateToken.EstateCRUDData memory creation, bytes memory signature) internal view {
        bytes32 hashedData = keccak256(abi.encodePacked(creation.landIds, creation.gameIds));
        address signer =
            SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);

        require(signer == _backAddress, "INVALID SIGNATURE");
    }
 */
    /* function _verifyAdjacencyUpdate(
        uint256 estateId,
        IEstateToken.UpdateEstateData memory update,
        bytes memory signature
    ) internal view {
        bytes32 hashedData =
            keccak256(
                abi.encodePacked(
                    estateId,
                    update.landAndGameAssociationsToAdd[0],
                    update.landAndGameAssociationsToAdd[1],
                    update.landAndGameAssociationsToRemove[0],
                    update.landAndGameAssociationsToRemove[1]
                )
            );
        address signer =
            SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);

        require(signer == _backAddress, "INVALID SIGNATURE");
    } */

    /* function updateFees(uint256 newMintingFee, uint256 newUpdateFee) external {
        address msgSender = _msgSender();
        require(msgSender == _admin, "ADMIN_ONLY");
        _estateMintingFee = newMintingFee;
        _estateUpdateFee = newUpdateFee;
    } */
}
