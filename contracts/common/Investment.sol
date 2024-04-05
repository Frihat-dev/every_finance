// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../libraries/FeeMinter.sol";
import "./Management.sol";
import "./Proof.sol";
import "./Token.sol";

/**
 * @dev Implementation of the contract Investment.
 * It allows the investor to depositProof/withdraw funds and the manager to validate
 * the depositProof/withdrawalProof investor requests.
 */

interface IParity {
    function setDepositData(
        uint256 amountMinted_,
        uint256 amountValidated_,
        uint256 id_
    ) external;

    function setWithdrawalData(
        uint256 amountMinted_,
        uint256 amountValidated_,
        uint256 id_
    ) external;
}

contract Investment is AccessControlEnumerable, Pausable {
    using Math for uint256;
    bytes32 public constant PROOF = keccak256("PROOF");
    bytes32 public constant MANAGER = keccak256("MANAGER");
    uint256 public constant MAX_PRICE = type(uint256).max;
    uint256 public immutable id;
    uint256 public currentEventId;
    uint256 public tokenPrice;
    uint256 public tokenPriceMean;
    uint256 public managementFeeLastTime;
    uint256 public depositProofTokenId;
    uint256 public withdrawalProofTokenId;
    uint256 public eventBatchSize;
    uint256 public lastPerformanceFee;
    uint256 public lastManagementFee;
    uint256 public totalPerformanceFee;
    uint256 public totalManagementFee;
    address public asset;
    Token public token;
    Management public management;
    Proof public depositProof;
    Proof public withdrawalProof;
    IParity public managementParity;
    event UpdateManagement(address indexed management_);
    event UpdateDepositProof(address indexed depositProof_);
    event UpdateWithdrawalProof(address indexed withdrawalProof_);
    event UpdateManagementParity(address indexed managementParity_);
    event UpdateToken(address indexed token_);
    event UpdateAsset(address indexed asset_);
    event UpdateEventBatchSize(uint256 eventBatchSize_);
    event DepositRequest(address indexed account_, uint256 amount_);
    event CancelDepositRequest(address indexed account_, uint256 amount_);
    event WithdrawalRequest(address indexed account_, uint256 amount_);
    event CancelWithdrawalRequest(address indexed account_, uint256 amount_);
    event StartNextEvent(uint256 tokenPrice, uint256 currentEventId);

    event Validatedeposit(
        uint256 indexed tokenId_,
        uint256 validatedAmount_,
        uint256 mintedAmount_
    );
    event Validatewithdrawal(
        uint256 indexed tokenId_,
        uint256 validatedAmount_,
        uint256 SentAmount_
    );
    event MintPerformanceFee(uint256 performanceFee_);
    event MintManagementFee(uint256 managementFee_);
    event MintOrBurnInvestmentFee(
        uint256 amount_,
        bool isFee_,
        uint256 remainingAmount_
    );

    constructor(
        uint256 id_,
        address asset_,
        address token_,
        address management_,
        address depositProof_,
        address withdrawalProof_,
        address admin_
    ) payable {
        require(id_ <= 2, "Every.finance: out of range");
        require(token_ != address(0), "Every.finance: zero address");
        require(management_ != address(0), "Every.finance: zero address");
        require(depositProof_ != address(0), "Every.finance: zero address");
        require(withdrawalProof_ != address(0), "Every.finance: zero address");
        require(admin_ != address(0), "Every.finance: zero address");
        id = id_;
        token = Token(token_);
        management = Management(management_);
        depositProof = Proof(depositProof_);
        withdrawalProof = Proof(withdrawalProof_);
        if (asset_ != address(0)) {
            (bool success_, uint8 assetDecimals_) = AssetTransfer
                .tryGetAssetDecimals(IERC20(asset_));
            require(success_, "Every.finance: no decimal");
            require(assetDecimals_ <= uint8(18), "Every.finance: max decimal");
            asset = asset_;
        }
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(PROOF, address(depositProof_));
        _setupRole(PROOF, address(withdrawalProof_));
    }

    receive() external payable {}

    /**
     * @dev Update management.
     * @param management_ management contract address
     * Emits an {UpdateManagement} event indicating the updated management contract.
     */
    function updateManagement(
        address management_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(management_ != address(0), "Every.finance: zero address");
        require(management_ != address(management), "Every.finance: no change");
        management = Management(management_);
        emit UpdateManagement(management_);
    }

    /**
     * @dev Update depositProof.
     * @param depositProof_ depositProof contract address
     * Emits an {UpdateDepositProof} event indicating the updated depositProof contract.
     */
    function updateDepositProof(
        address depositProof_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(depositProof_ != address(0), "Every.finance: zero address");
        require(
            depositProof_ != address(depositProof),
            "Every.finance: no change"
        );
        _revokeRole(PROOF, address(depositProof));
        _grantRole(PROOF, depositProof_);
        depositProof = Proof(depositProof_);
        emit UpdateDepositProof(depositProof_);
    }

    /**
     * @dev Update withdrawalProof.
     * @param withdrawalProof_ withdrawalProof contract address
     * Emits an {UpdateWithdrawalProof} event indicating the updated withdrawalProof contract.
     */
    function updateWithdrawalProof(
        address withdrawalProof_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(withdrawalProof_ != address(0), "Every.finance: zero address");
        require(
            withdrawalProof_ != address(withdrawalProof),
            "Every.finance: no change"
        );
        _revokeRole(PROOF, address(withdrawalProof));
        _grantRole(PROOF, withdrawalProof_);
        withdrawalProof = Proof(withdrawalProof_);
        emit UpdateWithdrawalProof(withdrawalProof_);
    }

    /**
     * @dev Update managementParity.
     * @param managementParity_ ManagementParity contract address
     * Emits an {UpdateManagementParity} event indicating the updated ManagementParity contract.
     */
    function updateManagementParity(
        address managementParity_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(managementParity_ != address(0), "Every.finance: zero address");
        require(
            managementParity_ != address(managementParity),
            "Every.finance: no change"
        );
        managementParity = IParity(managementParity_);
        emit UpdateManagementParity(managementParity_);
    }

    /**
     * @dev Update the yield-bearing token address.
     * @param token_ token's address.
     * Emits an {UpdateToken} event indicating the updated token contract.
     */
    function updateToken(address token_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token_ != address(0), "Every.finance: zero address");
        require(token_ != address(token), "Every.finance: no change");
        token = Token(token_);
        emit UpdateToken(token_);
    }

    /**
     * @dev Update the underlying asset that investors can deposit.
     * asset's address cannot be updated if there are deposit/withdrawal requests on pending.
     * @param asset_ asset's address.
     * Emits an {UpdateAsset} event indicating the updated asset `asset_`.
     */
    function updateAsset(address asset_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(asset != asset_, "Tansformative.Fi: no asset change");
        require(
            (depositProof.totalAmount() == 0) &&
                (withdrawalProof.totalAmount() == 0),
            "Every.finance: requests on pending"
        );
        if (asset_ != address(0)) {
            (bool success_, uint8 assetDecimals_) = AssetTransfer
                .tryGetAssetDecimals(IERC20(asset_));
            require(success_, "Every.finance: no decimal");
            require(assetDecimals_ <= uint8(18), "Every.finance: max decimal");
        }
        asset = asset_;
        emit UpdateAsset(asset_);
    }

    /**
     * @dev Update eventBatchSize (maximum  number of investors to be validate by batch).
     * @param eventBatchSize_  new eventBatchSize number.
     * Emits an {UpdateEventBatchSize} event indicating the updated eventBatchSize `eventBatchSize_`.
     */
    function updateEventBatchSize(
        uint256 eventBatchSize_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(eventBatchSize_ != 0, "Every.finance: zero value");
        eventBatchSize = eventBatchSize_;
        emit UpdateEventBatchSize(eventBatchSize_);
    }

    /**
     * @dev Update ManagementFeeLastTime.
     */
    function updateManagementFeeLastTime(
        uint256 managementFeeLastTime_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        managementFeeLastTime = managementFeeLastTime_;
    }

    /**
     * @dev Update TokenPriceMean.
     */
    function updateTokenPriceMean(
        uint256 tokenPriceMean_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenPriceMean = tokenPriceMean_;
    }

    /**
     * @dev start new event (manager cycle validation).
     * Emits an {UpdateStartNextEvent} event with token price `tokenPrice` and next event id `currentEventId`.
     *
     */
    function startNextEvent() external onlyRole(MANAGER) {
        (tokenPrice, ) = management.tokenPrice();
        currentEventId += 1;
        emit StartNextEvent(tokenPrice, currentEventId);
    }

    /**
     * @dev validate investor deposit requests by the manager.
     * The deposit request consists of minting the required amount of yield-bearing token for the investor, and
     * decreasing his pending request amount by an equivalent amount.
     * If the deposit request is fully validated (the pending request amount is zero), the corresponding proof is burned.
     * @param tokenIds_ array of Proof tokens ids.
     * @param maxdeposit_  max total amount of deposit asset to validate.
     * Emits an {Validatedeposit} event with token id `tokenId_`, validate deposit asset amount
     * `amountAsset_` and minted token amount `amountToken_`.
     */
    function validateDeposits(
        uint256[] calldata tokenIds_,
        uint256 maxdeposit_
    )
        external
        whenNotPaused
        onlyRole(MANAGER)
        returns (uint256 newMaxdeposit_)
    {
        uint256 amountAsset_;
        uint256 amountAssetTotal_;
        uint256 amountToken_;
        uint256 amountTokenTotal_;
        uint256 tokenId_;
        uint256 size_ = tokenIds_.length;
        uint256 totalSupplyToken_ = token.totalSupply();
        address owner_;
        require(size_ != 0, "Every.finance: size is zero");
        require(size_ <= eventBatchSize, "Every.finance: max size");
        for (uint256 i = 0; i < size_; ) {
            tokenId_ = tokenIds_[i];
            owner_ = depositProof.ownerOf(tokenId_);
            require(owner_ != address(0), "Every.finance: zero address");
            if (!isValidPrice(depositProof, tokenId_)) {
                depositProof.updateEventId(tokenId_, currentEventId);
            } else {
                if (maxdeposit_ <= amountAssetTotal_) {
                    break;
                }
                depositProof.preValidatePendingRequest(
                    tokenId_,
                    currentEventId
                );
                (amountAsset_, , , , ) = depositProof.pendingRequests(tokenId_);
                amountAsset_ = Math.min(
                    maxdeposit_ - amountAssetTotal_,
                    amountAsset_
                );
                amountToken_ = Math.mulDiv(
                    amountAsset_,
                    FeeMinter.SCALING_FACTOR,
                    tokenPrice
                );
                if (
                    (owner_ == address(managementParity)) && (amountAsset_ != 0)
                ) {
                    managementParity.setDepositData(
                        amountToken_,
                        amountAsset_,
                        id
                    );
                }
                unchecked {
                    amountAssetTotal_ += amountAsset_;
                }
                if (amountToken_ != 0) {
                    token.mint(owner_, amountToken_);
                    amountTokenTotal_ += amountToken_;
                }
                depositProof.validatePendingRequest(
                    tokenId_,
                    amountAsset_,
                    currentEventId
                );

                emit Validatedeposit(tokenId_, amountAsset_, amountToken_);
            }
            unchecked {
                i++;
            }
        }
        unchecked {
            newMaxdeposit_ = maxdeposit_ - amountAssetTotal_;
        }
        if (amountTokenTotal_ != 0) {
            tokenPriceMean =
                ((totalSupplyToken_ * tokenPriceMean) +
                    (amountTokenTotal_ * tokenPrice)) /
                (totalSupplyToken_ + amountTokenTotal_);
        }
        if (managementFeeLastTime == 0) {
            managementFeeLastTime = block.timestamp;
        }
    }

    /**
     * @dev validate investor withdrawal requests by the manager.
     * The deposit request consists of sending the required amount of asset to the investor, and
     * burning the equivalent amount in yield-bearing token.
     * If the withdrawal request is fully validated (the pending request amount is zero), the corresponding proof is burned.
     * @param tokenIds_ array of Proof tokens ids.
     * @param maxwithdrawal_  max total amount of withdrawal to validate.
     * Emits an {ValidateWithdrawal} event with token id `tokenId_`, validate withdrawal asset amount
     * `amountAsset_` and burned token amount `amountToken_`.
     */
    function validateWithdrawals(
        uint256[] calldata tokenIds_,
        uint256 maxwithdrawal_
    )
        external
        whenNotPaused
        onlyRole(MANAGER)
        returns (uint256 _newMaxwithdrawal)
    {
        uint256 amountToken_;
        uint256 amountTokenTotal_;
        uint256 amountAsset_;
        uint256 size_ = tokenIds_.length;
        uint256 tokenId_;
        address owner_;
        require(size_ != 0, "Every.finance: size is zero");
        require(size_ <= eventBatchSize, "Every.finance: max size");
        uint256 amountTotal_ = withdrawalProof.totalAmount();
        for (uint256 i = 0; i < size_; ) {
            tokenId_ = tokenIds_[i];
            owner_ = withdrawalProof.ownerOf(tokenId_);
            require(owner_ != address(0), "Every.finance: zero address");
            if (!isValidPrice(withdrawalProof, tokenId_)) {
                withdrawalProof.updateEventId(tokenId_, currentEventId);
            } else {
                withdrawalProof.preValidatePendingRequest(
                    tokenId_,
                    currentEventId
                );
                (amountToken_, , , , ) = withdrawalProof.pendingRequests(
                    tokenId_
                );
                amountToken_ = Math.min(
                    Math.mulDiv(maxwithdrawal_, amountToken_, amountTotal_),
                    amountToken_
                );
                unchecked {
                    amountTokenTotal_ += amountToken_;
                }
                amountAsset_ = Math.mulDiv(
                    amountToken_,
                    tokenPrice,
                    FeeMinter.SCALING_FACTOR
                );
                if (
                    (owner_ == address(managementParity)) && (amountToken_ != 0)
                ) {
                    managementParity.setWithdrawalData(
                        amountAsset_,
                        amountToken_,
                        id
                    );
                }
                withdrawalProof.validatePendingRequest(
                    tokenId_,
                    amountToken_,
                    currentEventId
                );
                if (amountAsset_ != 0) {
                    AssetTransfer.transfer(owner_, amountAsset_, asset);
                }

                emit Validatewithdrawal(tokenId_, amountToken_, amountAsset_);
            }
            unchecked {
                i++;
            }
        }
        unchecked {
            _newMaxwithdrawal = maxwithdrawal_ - amountTokenTotal_;
        }

        if ((amountTokenTotal_) != 0) {
            token.burn(address(this), amountTokenTotal_);
        }
    }

    /**
     * @dev make a deposit request by the investor.
     * the investor sends an amount of asset to the smart contracts and deposit fee to the treasury.
     * the investor receives or updates his deposit Proof {ERC721}.
     * @param account_ investor'address.
     * @param tokenId_ token id of the deposit Proof (if tokenId_ == 0, then a new token is minted).
     * @param amount_ amount of asset to deposit.
     * @param minPrice_ minimum price of yield-bearing token to be accepted.
     * @param maxPrice_ maximum price of yield-bearing token to be accepted.
     * @param maxFee_ maximum deposit fee to be accepted.
     * Emits an {DepositRequest} event with account `account_` and  amount `amount_`.
     */
    function depositRequest(
        address account_,
        uint256 tokenId_,
        uint256 amount_,
        uint256 minPrice_,
        uint256 maxPrice_,
        uint256 maxFee_
    ) external payable whenNotPaused {
        uint256 fee_;
        require(amount_ != 0, "Transformative Fi: zero amount");
        if (account_ != address(managementParity)) {
            require(
                amount_ >= management.minDepositAmount(),
                "Every.finance: min depositProof Amount"
            );
            fee_ = getDepositFee(amount_);
            require(fee_ <= maxFee_, "Every.finance: max allowed fee");
            amount_ -= fee_;
        }
        require(
            (minPrice_ <= maxPrice_) && (maxPrice_ != 0),
            "Every.finance: wrong prices"
        );
        if (tokenId_ == 0) {
            depositProofTokenId += 1;
            depositProof.mint(
                account_,
                depositProofTokenId,
                amount_,
                minPrice_,
                maxPrice_,
                currentEventId
            );
        } else {
            require(
                depositProof.ownerOf(tokenId_) == account_,
                "Every.finance: account is not owner"
            );

            if (account_ != _msgSender()) {
                (
                    ,
                    ,
                    uint256 minPriceOld_,
                    uint256 maxPriceOld_,

                ) = depositProof.pendingRequests(tokenId_);
                require(
                    (minPrice_ == minPriceOld_) && (maxPrice_ == maxPriceOld_),
                    "Every.finance: prices don't match"
                );
            }
            depositProof.increasePendingRequest(
                tokenId_,
                amount_,
                minPrice_,
                maxPrice_,
                currentEventId
            );
        }
        if (asset != address(0)) {
            AssetTransfer.transferFrom(
                _msgSender(),
                address(this),
                amount_ + fee_,
                IERC20(asset)
            );
        } else {
            require(
                (msg.value == amount_ + fee_),
                "Every.finance: no required amount"
            );
        }
        if (fee_ > 0) {
            AssetTransfer.transfer(management.treasury(), fee_, asset);
        }
        emit DepositRequest(account_, amount_);
    }

    /**
     * @dev cancel a deposit request by the investor.
     * the investor can cancel a full or partial amount of his deposit.
     * the investor burns or updates his deposit Proof {ERC721}.
     * @param tokenId_ token id of the deposit Proof (if tokenId_ == 0, then a new token is minted).
     * @param amount_ amount of asset to cancel.
     * Emits an {CancelDepositRequest} event with the caller and  amount `amount_`.
     */
    function cancelDepositRequest(
        uint256 tokenId_,
        uint256 amount_
    ) external whenNotPaused {
        require(
            management.isCancelDeposit(),
            "Every.finance: no deposit cancel"
        );
        require(amount_ != 0, "Transformative Fi: zero amount");
        require(
            depositProof.ownerOf(tokenId_) == _msgSender(),
            "Every.finance: caller is not owner"
        );
        depositProof.decreasePendingRequest(tokenId_, amount_, currentEventId);
        AssetTransfer.transfer(_msgSender(), amount_, asset);
        emit CancelDepositRequest(_msgSender(), amount_);
    }

    /**
     * @dev make a withdrawal request by the investor.
     * the investor sends an amount of yield-bearing token to the smart contracts and withdrawal fee to the treasury.
     * the investor receives or updates his withdrawal Proof {ERC721}.
     * @param tokenId_ token id of the withdrawal Proof (if tokenId_ == 0, then a new token is minted).
     * @param amount_ amount of yield-bearing token to withdraw.
     * @param minPrice_ minimum price of yield-bearing token to be accepted.
     * @param maxPrice_ maximum price of yield-bearing token to be accepted.
     * @param maxFee_ maximum withdrawal fee to be accepted.
     * Emits an {WithdrawalRequest} event with account `account_` and  amount `amount_`.
     */
    function withdrawalRequest(
        uint256 tokenId_,
        uint256 amount_,
        uint256 minPrice_,
        uint256 maxPrice_,
        uint256 maxFee_
    ) external whenNotPaused {
        require(amount_ != 0, "Transformative Fi: zero amount");
        uint256 fee_;
        require(
            token.balanceOf(_msgSender()) >= amount_,
            "Transformative Fi: amount exceeds balance"
        );
        if (_msgSender() != address(managementParity)) {
            uint256 holdTime_ = token.getHoldTime(_msgSender());
            fee_ =
                (management.getWithdrawalFeeRate(holdTime_) * amount_) /
                FeeMinter.SCALING_FACTOR;

            require(fee_ <= maxFee_, "Every.finance: max allowed fee");
            amount_ = amount_ - fee_;
        }
        require(
            (minPrice_ <= maxPrice_) && (maxPrice_ != 0),
            "Every.finance: wrong prices"
        );
        if (tokenId_ == 0) {
            withdrawalProofTokenId += 1;
            withdrawalProof.mint(
                _msgSender(),
                withdrawalProofTokenId,
                amount_,
                minPrice_,
                maxPrice_,
                currentEventId
            );
        } else {
            require(
                withdrawalProof.ownerOf(tokenId_) == _msgSender(),
                "Every.finance: caller is not owner"
            );

            withdrawalProof.increasePendingRequest(
                tokenId_,
                amount_,
                minPrice_,
                maxPrice_,
                currentEventId
            );
        }
        token.transferFrom(_msgSender(), address(this), amount_);
        if (fee_ != 0) {
            token.transferFrom(_msgSender(), management.treasury(), fee_);
        }
        emit WithdrawalRequest(_msgSender(), amount_);
    }

    /**
     * @dev cancel a withdrawal request by the investor.
     * the investor can cancel a full or partial amount of his withdrawal.
     * the investor burns or updates his withdrawal Proof {ERC721}.
     * @param tokenId_ token id of the withdrawal Proof (if tokenId_ == 0, then a new token is minted).
     * @param amount_ amount of yield-bearing token to cancel.
     * Emits an {CancelWithdrawalRequest} event with the caller and  amount `amount_`.
     */
    function cancelWithdrawalRequest(
        uint256 tokenId_,
        uint256 amount_
    ) external whenNotPaused {
        require(
            management.isCancelWithdrawal(),
            "Every.finance: no withdrawal cancel"
        );
        require(amount_ != 0, "Transformative Fi: zero amount");
        require(
            withdrawalProof.ownerOf(tokenId_) == _msgSender(),
            "Every.finance: caller is not owner"
        );
        withdrawalProof.decreasePendingRequest(
            tokenId_,
            amount_,
            currentEventId
        );
        token.transfer(_msgSender(), amount_);
        emit CancelWithdrawalRequest(_msgSender(), amount_);
    }

    /**
     * @dev Send asset to the SafeHouse by the manager.
     * @param amount_ amount to send.
     */
    function sendToSafeHouse(
        uint256 amount_
    ) external whenNotPaused onlyRole(MANAGER) {
        require(amount_ != 0, "Every.finance: zero amount");
        address safeHouse_ = management.safeHouse();
        require(safeHouse_ != address(0), "Every.finance: zero address");
        AssetTransfer.transfer(safeHouse_, amount_, asset);
    }

    /**
     * @dev mint Performance fee by the manager
     * performance fee are minted in yield-bearing token.
     */
    function mintPerformanceFee() external onlyRole(MANAGER) {
        (uint256 tokenPrice_, ) = management.tokenPrice();
        uint256 performanceFeeRate_ = management.performanceFeeRate();
        address treasury_ = management.treasury();
        uint256 performanceFee_;
        (tokenPriceMean, performanceFee_) = FeeMinter.mintPerformanceFee(
            tokenPrice_,
            tokenPriceMean,
            performanceFeeRate_,
            treasury_,
            address(token)
        );
        lastPerformanceFee = performanceFee_;
        totalPerformanceFee += performanceFee_;
        emit MintPerformanceFee(performanceFee_);
    }

    /**
     * @dev mint management fee by the manager
     * management fee are minted in yield-bearing token.
     */
    function mintManagementFee() external onlyRole(MANAGER) {
        uint256 managementFeeRate_ = management.managementFeeRate();
        address treasury_ = management.treasury();
        uint256 managementFee_;
        (managementFeeLastTime, managementFee_) = FeeMinter.mintManagementFee(
            managementFeeLastTime,
            managementFeeRate_,
            treasury_,
            address(token)
        );
        lastManagementFee = managementFee_;
        totalManagementFee += managementFee_;
        emit MintManagementFee(managementFee_);
    }

    /**
     * @dev mint or burn Investment fee by the manager
     * Investment fee are minted (negative fee) Or bunred (positive fee) in yield-bearing token.
     * @param amount_ amount of negative/positive fee.
     * @param isFee_ true if negative fee, false otherwise.
     */
    function mintOrBurnInvestmentFee(
        uint256 amount_,
        bool isFee_
    ) external payable onlyRole(MANAGER) returns (uint256 remainingAmount_) {
        (uint256 tokenPrice_, ) = management.tokenPrice();
        address treasury_ = management.treasury();
        remainingAmount_ = FeeMinter.MintInvestmentFee(
            amount_,
            tokenPrice_,
            isFee_,
            payable(treasury_),
            address(token),
            asset
        );

        emit MintOrBurnInvestmentFee(amount_, isFee_, remainingAmount_);
    }

    /**
     * @dev get deposit fee for a deposit amount `amount_`
     * @param amount_ amount in asset to deposit by the investor.
     */
    function getDepositFee(uint256 amount_) public view returns (uint256) {
        return management.getDepositFee(amount_);
    }

    /**
     * @dev get  yield-bearing token price.
     */
    function getTokenPrice() public view returns (uint256 price_) {
        (price_, ) = management.tokenPrice();
    }

    /**
     * @dev verify if the price bounds of deposit/withdrawal pending request are valid.
     * @param proof_ Proof contract'address.
     * @param tokenId_  token id of the pending request.
     * @return isValid_ true if price bounds are valid , fase otherwise.
     */
    function isValidPrice(
        Proof proof_,
        uint256 tokenId_
    ) public view returns (bool isValid_) {
        (, , uint256 minPrice_, uint256 maxPrice_, ) = proof_.pendingRequests(
            tokenId_
        );
        isValid_ = (minPrice_ <= tokenPrice) && (maxPrice_ >= tokenPrice);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
