// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

/**
 * @dev Implementation of the contract SafeHouseNonFungibeTokens.
 * It allows to manage deposits and withdrawals of Non Fungible Tokens.
 *
 */

contract SafeHouseNonFungibeTokens is
    ERC1155Holder,
    ERC721Holder,
    AccessControlEnumerable,
    Pausable
{
    bytes32 public constant MANAGER = keccak256("MANAGER");
    mapping(address => bool) public tokens;

    event AddTokenERC721(address indexed token_);
    event AddTokenERC1155(address indexed token_);
    event RemoveTokenERC721(address indexed token_);
    event RemoveTokenERC1155(address indexed token_);

    event DepositTokenERC721(
        address indexed sender_,
        address indexed token_,
        uint256 tokenId_
    );
    event DepositTokenERC1155(
        address indexed sender_,
        address indexed token_,
        uint256 tokenId_
    );

    event WithdrawTokenERC721(
        address indexed sender_,
        address indexed token_,
        uint256 tokenId_
    );
    event WithdrawTokenERC1155(
        address indexed sender_,
        address indexed token_,
        uint256 tokenId_
    );

    constructor(address admin_, address manager_) {
        require(admin_ != address(0), "Every.finance: zero address");
        require(manager_ != address(0), "Every.finance: zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(MANAGER, manager_);
    }

    /**
     * @dev add a token.
     * a token is a nft ERC721.
     * Only the manager can add a token.
     * @param _token token's ERC721 interface.
     * Emits an {AddTokenERC721} event indicating the added token's address.
     */
    function addTokenERC721(IERC721 _token) external onlyRole(MANAGER) {
        require(!tokens[address(_token)], "Every.finance: token exists");
        tokens[address(_token)] = true;
        emit AddTokenERC721(address(_token));
    }

    /**
     * @dev add a token.
     * a token is a nft ERC721.
     * Only the manager can remove a token.
     * @param _token token's ERC721 interface.
     * Emits an {RemoveTokenERC721} event indicating the removed token's address.
     */
    function removeTokenERC721(IERC721 _token) external onlyRole(MANAGER) {
        require(tokens[address(_token)], "Every.finance: no token");
        tokens[address(_token)] = false;
        emit RemoveTokenERC721(address(_token));
    }

    /**
     * @dev add a token.
     * a token is a nft ERC1155.
     * Only the manager can add a token.
     * @param _token token's interface ERC1155.
     * Emits an {AddTokenERC1155} event indicating the added token's address.
     */
    function addTokenERC1155(IERC1155 _token) external onlyRole(MANAGER) {
        require(!tokens[address(_token)], "Every.finance: token exists");
        tokens[address(_token)] = true;
        emit AddTokenERC1155(address(_token));
    }

    /**
     * @dev add a token.
     * a token is a nft ERC1155.
     * Only the manager can remove a token.
     * @param _token token's ERC1155.
     * Emits an {RemoveTokenERC1155} event indicating the removed token'address.
     */
    function removeTokenERC1155(IERC721 _token) external onlyRole(MANAGER) {
        require(tokens[address(_token)], "Every.finance: no token");
        tokens[address(_token)] = false;
        emit RemoveTokenERC1155(address(_token));
    }

    /**
     * @dev deposit a ERC1155 token  in the SafeHouse.
     * Only the manager can deposit a token.
     * @param token_ token ERC1155 interface.
     * @param tokenId_  tokenId.
     * Emits an {DepositTokenERC1155} event with caller `msg.sender`, token's address and tokenId `tokenId_`.
     */
    function depositTokenERC1155(
        IERC1155 token_,
        uint256 tokenId_
    ) external payable whenNotPaused onlyRole(MANAGER) {
        require(tokens[address(token_)], "Every.finance: no allowed token");
        token_.safeTransferFrom(msg.sender, address(this), tokenId_, 1, "");
        emit DepositTokenERC1155(msg.sender, address(token_), tokenId_);
    }

    /**
     * @dev deposit a ERC721 token in the SafeHouse.
     * Only the manager can deposit a token.
     * @param token_ token ERC721 interface.
     * @param tokenId_  tokenId.
     * Emits an {DepositTokenERC721} event with caller `msg.sender`, token's address  and tokenId `tokenId_`.
     */
    function depositTokenERC721(
        IERC721 token_,
        uint256 tokenId_
    ) external payable whenNotPaused onlyRole(MANAGER) {
        require(tokens[address(token_)], "Every.finance: no allowed token");
        token_.safeTransferFrom(msg.sender, address(this), tokenId_);
        emit DepositTokenERC721(msg.sender, address(token_), tokenId_);
    }

    /**
     * @dev withdraw a ERC721 token in the SafeHouse.
     * Only the manager can withdraw a token.
     * @param token_ token ERC721 interface.
     * @param tokenId_  tokenId.
     * Emits an {WithdrawTokenERC721} event with caller `msg.sender`, token's address and tokenId `tokenId_`.
     */
    function withdrawTokenERC721(
        IERC721 token_,
        uint256 tokenId_
    ) external payable whenNotPaused onlyRole(MANAGER) {
        require(tokens[address(token_)], "Every.finance: no allowed token");
        token_.safeTransferFrom(address(this), msg.sender, tokenId_);
        emit WithdrawTokenERC721(msg.sender, address(token_), tokenId_);
    }

    /**
     * @dev withdraw a ERC1155 token in the SafeHouse.
     * Only the manager can withdraw a token.
     * @param token_ token ERC1155 interface
     * @param tokenId_  tokenId.
     * Emits an {WithdrawTokenERC1155} event with caller `msg.sender`, token's address and tokenId `tokenId_`.
     */
    function withdrawTokenERC1155(
        IERC1155 token_,
        uint256 tokenId_
    ) external payable whenNotPaused onlyRole(MANAGER) {
        require(tokens[address(token_)], "Every.finance: no allowed token");
        token_.safeTransferFrom(address(this), msg.sender, tokenId_, 1, "");
        emit WithdrawTokenERC1155(msg.sender, address(token_), tokenId_);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Checks whether the contract supports the given interface.
    /// @dev This function checks whether the contract supports the given interface by delegating the call to the inherited contracts ERC1155Receiver and AccessControlEnumerable.
    /// @param interfaceId The interface identifier to check.
    /// @return A boolean indicating whether the contract supports the given interface.
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC1155Receiver, AccessControlEnumerable)
        returns (bool)
    {
        return
            ERC1155Receiver.supportsInterface(interfaceId) ||
            AccessControlEnumerable.supportsInterface(interfaceId);
    }
}
