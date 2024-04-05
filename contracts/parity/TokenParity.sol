// SPDX-License-Identifier: MIT
// Transformative.Fi Contracts
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TokenParityStorage.sol";

interface ITokenParityView {
    function verifyBurnCondition(uint256 _tokenId) external view returns (bool);

    function render(uint256 _tokenId) external view returns (string memory);
}

/**
 * @author Every.finance.
 * @notice Implementation of the contract TokenParity.
 */

contract TokenParity is ERC721Enumerable, Ownable, AccessControlEnumerable {
    using Strings for uint256;
    bytes32 public constant INVESTMENT = keccak256("INVESTMENT");
    address public investment;
    string public baseURI;
    bool public isOnChainData;
    TokenParityStorage public tokenParityStorage;
    ITokenParityView public tokenParityView;
    event UpdateInvestment(address _investment);
    event MintParityToken(uint256 _tokenId);
    event BurnParityToken(uint256 _tokenId);
    event UpdateBaseURI(string _baseURI);
    event UpdateIsOnChainData(bool _state);

    constructor(
        address _tokenParityStorage,
        address _tokenParityView
    ) ERC721("ParityToken", "PARITY") {
        require(
            _tokenParityStorage != address(0),
            "Every.finance: zero address"
        );
        require(_tokenParityView != address(0), "Every.finance: zero address");
        tokenParityStorage = TokenParityStorage(_tokenParityStorage);
        tokenParityView = ITokenParityView(_tokenParityView);
       _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    /**
     * @dev Update investment.
     * @param investment_.
     * Emits an {UpdateInvestment} event indicating the updated investment `investment_`.
     */
    function updateInvestment(
        address investment_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(investment_ != address(0), "Transformative.Fi: zero address");
        require(investment_ != investment, "Transformative.Fi: no change");
        _revokeRole(INVESTMENT, investment);
        _grantRole(INVESTMENT, investment_);
        investment = investment_;
        emit UpdateInvestment(investment_);
    }

    function updateTokenParityStorage(
        address _tokenParityStorage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _tokenParityStorage != address(0),
            "Every.finance: zero address"
        );
        tokenParityStorage = TokenParityStorage(_tokenParityStorage);
    }

    function updateTokenParityView(
        address _tokenParityView
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_tokenParityView != address(0), "Every.finance: zero address");
        tokenParityView = ITokenParityView(_tokenParityView);
    }

    function updateIsOnChainData(bool _state) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isOnChainData != _state, "Every.finance: no change");
        isOnChainData = _state;
        emit UpdateIsOnChainData(_state);
    }

    function updateBaseURI(string calldata _tokenURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseURI = _tokenURI;
        emit UpdateBaseURI(_tokenURI);
    }

    function mint(
        address _account,
        ParityData.Position memory _position,
        uint256 _indexEvent,
        uint256[3] memory _price,
        bool _isFirst
    ) external onlyRole(INVESTMENT) {
        require(_account != address(0), "Every.finance: zero address");
        tokenParityStorage.updateUserPreference(
            _position,
            _indexEvent,
            _price,
            _isFirst
        );
        if (_isFirst) {
            _safeMint(_account, _position.tokenId);
            emit MintParityToken(_position.tokenId);
        }
    }

    function burn(uint256 _tokenId) external onlyRole(INVESTMENT) {
        require(ownerOf(_tokenId) != address(0), "Every.finance: zero address");
        tokenParityView.verifyBurnCondition(_tokenId);
        _burn(_tokenId);
        emit BurnParityToken(_tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        _requireMinted(tokenId);
        if (isOnChainData) {
            return tokenParityView.render(tokenId);
        } else {
            string memory _string = _baseURI();
            return
                bytes(_string).length > 0
                    ? string(abi.encodePacked(_string, tokenId.toString()))
                    : "";
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Enumerable, AccessControlEnumerable)
        returns (bool)
    {
        return
            ERC721Enumerable.supportsInterface(interfaceId) ||
            AccessControlEnumerable.supportsInterface(interfaceId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}
