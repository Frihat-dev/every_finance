// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
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

contract Investment is AccessControlEnumerable, Pausable {
    using Math for uint256;
    bytes32 public constant PROOF = keccak256("PROOF");
    bytes32 public constant MANAGER = keccak256("MANAGER");
    uint256 public constant MAX_PRICE = type(uint256).max;
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
    Token public token;
    Management public management;
    Proof public depositProof;
    Proof public withdrawalProof;
    mapping(address => bool) public allowedAssets;
    mapping(address => uint256) public totalDepositedAsset;
    mapping(address => address) public oracles;
    mapping(address => bool) public privateInvestors;
    event UpdateManagement(address indexed management_);
    event UpdateDepositProof(address indexed depositProof_);
    event UpdateWithdrawalProof(address indexed withdrawalProof_);
    event UpdateManagementParity(address indexed managementParity_);
    event UpdateToken(address indexed token_);
    event UpdateAsset(address indexed asset_, bool state_);
    event UpdateOracle(address indexed asset_, address Oracle_);
    event UpdatePrivateInvestor(address indexed account_, bool state_);
    event UpdateEventBatchSize(uint256 eventBatchSize_);
    event DepositRequest(
        address indexed account_,
        address indexed asset_,
        uint256 amount_
    );
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
        address token_,
        address management_,
        address depositProof_,
        address withdrawalProof_,
        address admin_
    ) payable {
        require(token_ != address(0), "Every.finance: zero address");
        require(management_ != address(0), "Every.finance: zero address");
        require(depositProof_ != address(0), "Every.finance: zero address");
        require(withdrawalProof_ != address(0), "Every.finance: zero address");
        require(admin_ != address(0), "Every.finance: zero address");
        token = Token(token_);
        management = Management(management_);
        depositProof = Proof(depositProof_);
        withdrawalProof = Proof(withdrawalProof_);
        /*  if (asset_ != address(0)) {
            (bool success_, uint8 assetDecimals_) = AssetTransfer
                .tryGetAssetDecimals(IERC20(asset_));
            require(success_, "Every.finance: no decimal");
            require(assetDecimals_ <= uint8(18), "Every.finance: max decimal");
            asset = asset_;
        }*
    */
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
     * @param state_  true to add an asset and false to remove it.
     * Emits an {UpdateAsset} event indicating the updated asset `asset_`.
     */
    function updateAsset(
        address asset_,
        bool state_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowedAssets[asset_] = state_;
        emit UpdateAsset(asset_, state_);
    }

    /**
     * @dev Update asset's oracle.
     * @param asset_ asset's address.
     * @param oracle_ asset's oracle.
     * Emits an {UpdateOracle} event indicating the updated asset's oracle `oracle_`.
     */
    function updateOracle(
        address asset_,
        address oracle_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        oracles[asset_] = oracle_;
        emit UpdateOracle(asset_, oracle_);
    }

    /**
     * @dev Update privateInvestors.
     * @param account_ investor's address.
     * @param state_  is true to add _account, false to remove it.
     * Emits an {UpdatePrivateInvestor} event indicating  `account_` and `state_`.
     */
    function updatePrivateInvestor(
        address account_,
        bool state_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        privateInvestors[account_] = state_;
        emit UpdatePrivateInvestor(account_, state_);
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
        uint256 totalSupplyToken_ = token.totalSupply();
        (
            uint256 amountAssetTotal_,
            uint256 amountTokenTotal_
        ) = _validateDeposits(tokenIds_, maxdeposit_);

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
        uint256 amountTotal_ = withdrawalProof.totalAmount(address(token));
        uint256 tokenPrice_ = tokenPrice;
        for (uint256 i = 0; i < size_; ) {
            tokenId_ = tokenIds_[i];
            owner_ = withdrawalProof.ownerOf(tokenId_);
            require(owner_ != address(0), "Every.finance: zero address");
            if (!isValidPrice(withdrawalProof, tokenId_, tokenPrice_)) {
                withdrawalProof.updateEventId(tokenId_, currentEventId);
            } else {
                withdrawalProof.preValidatePendingRequest(
                    tokenId_,
                    currentEventId
                );
                (amountToken_, , , , , ) = withdrawalProof.pendingRequests(
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

                withdrawalProof.validatePendingRequest(
                    tokenId_,
                    amountToken_,
                    currentEventId,
                    address(token)
                );
                if (amountAsset_ != 0) {
                    AssetTransfer.transfer(owner_, amountAsset_, address(0));
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
     * @param asset_ asset'address.
     * @param tokenId_ token id of the deposit Proof (if tokenId_ == 0, then a new token is minted).
     * @param amount_ amount of asset to deposit.
     * @param minPrice_ minimum price of yield-bearing token to be accepted.
     * @param maxPrice_ maximum price of yield-bearing token to be accepted.
     * @param maxFee_ maximum deposit fee to be accepted.
     * Emits an {DepositRequest} event with account `account_` and  amount `amount_`.
     */
    function depositRequest(
        address account_,
        address asset_,
        uint256 tokenId_,
        uint256 amount_,
        uint256 minPrice_,
        uint256 maxPrice_,
        uint256 maxFee_
    ) external payable whenNotPaused {
        uint256 fee_;
        require(amount_ != 0, "Every.finance: zero amount");
        require(allowedAssets[asset_], "Every.finance: not allowed asset");
        require(
            amount_ >= management.minDepositAmount(),
            "Every.finance: min depositProof Amount"
        );
        uint256 totalDepositedAsset_ = totalDepositedAsset[asset_];
        if (!privateInvestors[msg.sender]) {
            fee_ = getDepositFee(amount_);
            require(fee_ <= maxFee_, "Every.finance: max allowed fee");
            amount_ -= fee_;
        }
        require(
            totalDepositedAsset_ + amount_ <= management.assetCap(asset_),
            "Every.finance: cap asset"
        );
        require(
            (minPrice_ <= maxPrice_) && (maxPrice_ != 0),
            "Every.finance: wrong prices"
        );
        totalDepositedAsset[asset_] = totalDepositedAsset_ + amount_;
        if (tokenId_ == 0) {
            depositProofTokenId += 1;
            depositProof.mint(
                account_,
                asset_,
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
                    ,
                    address existedAsset_
                ) = depositProof.pendingRequests(tokenId_);
                require(
                    (minPrice_ == minPriceOld_) && (maxPrice_ == maxPriceOld_),
                    "Every.finance: prices don't match"
                );
                require(
                    asset_ == existedAsset_,
                    "Every.finance: existing asset is different"
                );
            }
            depositProof.increasePendingRequest(
                tokenId_,
                amount_,
                minPrice_,
                maxPrice_,
                currentEventId,
                asset_
            );
        }
        if (asset_ != address(0)) {
            AssetTransfer.transferFrom(
                _msgSender(),
                address(this),
                amount_ + fee_,
                IERC20(asset_)
            );
        } else {
            require(
                (msg.value == amount_ + fee_),
                "Every.finance: no required amount"
            );
        }
        if (fee_ > 0) {
            AssetTransfer.transfer(management.treasury(), fee_, asset_);
        }
        emit DepositRequest(account_, asset_, amount_);
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
        require(amount_ != 0, "Every.finance: zero amount");
        require(
            depositProof.ownerOf(tokenId_) == _msgSender(),
            "Every.finance: caller is not owner"
        );
        (, , , , , address asset_) = depositProof.pendingRequests(tokenId_);
        totalDepositedAsset[asset_] -= amount_;
        depositProof.decreasePendingRequest(
            tokenId_,
            amount_,
            currentEventId,
            asset_
        );
        AssetTransfer.transfer(_msgSender(), amount_, asset_);
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
        require(amount_ != 0, "Every.finance: zero amount");
        uint256 fee_;
        require(
            token.balanceOf(_msgSender()) >= amount_,
            "Every.finance: amount exceeds balance"
        );
        if (!privateInvestors[msg.sender]) {
            uint256 holdTime_ = token.getHoldTime(_msgSender());
            if (management.isMinLockUpPeriod()) {
                require(
                    block.timestamp - holdTime_ >= management.minLockUpPeriod(),
                    "Every.Finance: min lokup period"
                );
            }

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
                address(token),
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
                currentEventId,
                address(token)
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
        require(amount_ != 0, "Every.finance: zero amount");
        require(
            withdrawalProof.ownerOf(tokenId_) == _msgSender(),
            "Every.finance: caller is not owner"
        );
        withdrawalProof.decreasePendingRequest(
            tokenId_,
            amount_,
            currentEventId,
            address(token)
        );
        token.transfer(_msgSender(), amount_);
        emit CancelWithdrawalRequest(_msgSender(), amount_);
    }

    /**
     * @dev Send asset to the SafeHouse by the manager.
     * @param amount_ amount to send.
     * @param asset_  asset's address.
     */
    function sendToSafeHouse(
        uint256 amount_,
        address asset_
    ) external whenNotPaused onlyRole(MANAGER) {
        require(amount_ != 0, "Every.finance: zero amount");
        address safeHouse_ = management.safeHouse();
        require(safeHouse_ != address(0), "Every.finance: zero address");
        AssetTransfer.transfer(safeHouse_, amount_, asset_);
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
            address(0)
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
        uint256 tokenId_,
        uint256 price_
    ) public view returns (bool isValid_) {
        (, , uint256 minPrice_, uint256 maxPrice_, , ) = proof_.pendingRequests(
            tokenId_
        );
        isValid_ = (minPrice_ <= price_) && (maxPrice_ >= price_);
    }

    function getLatestPrice(
        address asset_
    ) public view returns (uint256, uint256) {
        require(asset_ != address(0), "Every.finance: zero address");
        address oracle_ = oracles[asset_];

        AggregatorV3Interface priceFeed = AggregatorV3Interface(oracle_);
        (
            ,
            /*uint80 roundID*/ int price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
            ,
            ,

        ) = priceFeed.latestRoundData();
        require(price > 0, "Every.finance: invalid price");
        uint8 decimals_ = priceFeed.decimals();
        return (uint256(price), decimals_);
    }

    function _validateDeposits(
        uint256[] calldata tokenIds_,
        uint256 maxdeposit_
    ) internal returns (uint256 amountAssetTotal_, uint256 amountTokenTotal_) {
        uint256 amountAsset_;
        uint256 amountToken_;
        uint256 price_;
        uint256 decimal_;
        uint256 size_ = tokenIds_.length;
        address owner_;
        address asset_;
        require(size_ != 0, "Every.finance: size is zero");
        require(size_ <= eventBatchSize, "Every.finance: max size");
        for (uint256 i = 0; i < size_; ) {
            owner_ = depositProof.ownerOf(tokenIds_[i]);
            require(owner_ != address(0), "Every.finance: zero address");
            (amountAsset_, , , , , asset_) = depositProof.pendingRequests(
                tokenIds_[i]
            );
            (price_, decimal_) = getLatestPrice(asset_);
            price_ = (price_ * 10) ^ (18 - decimal_);
            if (!isValidPrice(depositProof, tokenIds_[i], price_)) {
                depositProof.updateEventId(tokenIds_[i], currentEventId);
            } else {
                if (maxdeposit_ <= amountAssetTotal_) {
                    break;
                }
                depositProof.preValidatePendingRequest(
                    tokenIds_[i],
                    currentEventId
                );
                amountAsset_ = Math.min(
                    maxdeposit_ - amountAssetTotal_,
                    amountAsset_
                );

                amountToken_ = Math.mulDiv(amountAsset_, price_, 10 ^ decimal_);
                unchecked {
                    amountAssetTotal_ += amountToken_;
                }
                amountToken_ = Math.mulDiv(
                    amountToken_,
                    FeeMinter.SCALING_FACTOR,
                    tokenPrice
                );

                if (amountToken_ != 0) {
                    token.mint(owner_, amountToken_);
                    amountTokenTotal_ += amountToken_;
                }
                depositProof.validatePendingRequest(
                    tokenIds_[i],
                    amountAsset_,
                    currentEventId,
                    asset_
                );

                emit Validatedeposit(tokenIds_[i], amountAsset_, amountToken_);
            }
            unchecked {
                i++;
            }
        }
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
