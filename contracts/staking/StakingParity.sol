// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../libraries/AssetTransfer.sol";
import "../parity/libraries/ParityData.sol";
import "./interfaces/ITokenParityStorage.sol";
import "./interfaces/IManagementParity.sol";

contract StakingParity is IERC721Receiver, AccessControlEnumerable, Pausable {
    using Math for uint256;
    using SafeERC20 for IERC20;

    bytes32 public constant MANAGER = keccak256("MANAGER");

    struct Pack {
        address rewardToken;
        uint256 rewardTotal;
        uint256 periodFinish;
        uint256 lastUpdateTime;
        uint256 rewardDuration;
        uint256 rewardPerSecond;
        uint256 rewardPerTokenStored;
        uint256 minBoostingFactor;
        uint256 minAmount;
        ParityData.Amount idealRatio;
        ParityData.Amount idealAmount;
        ParityData.Amount weights;
    }

    uint256 public totalSupply;
    address public treasury;
    Pack[] public packs;

    address public tokenParityStorage;
    address public parityToken;
    address public managementParity;
    address public token;
    mapping(uint256 => mapping(uint256 => uint256)) public rewardPerTokenPaid;
    mapping(uint256 => mapping(uint256 => uint256)) public rewards;
    mapping(uint256 => uint256) public balances;
    mapping(address => uint256[]) public tokenIds;
    mapping(uint256 => uint256) public indexes;
    mapping(uint256 => address) public holders;

    event Staked(
        uint256 _tokenId,
        uint256 _amount1,
        address indexed _to,
        uint256 _option
    );
    event Unstaked(
        uint256 _tokenId,
        uint256 _amount1,
        address indexed _to,
        uint256 _option
    );
    event RewardPaid(
        address indexed _rewardToken,
        uint256 _reward,
        address indexed _to
    );
    event RewardAdded(uint256 _id, uint256 _reward);
    event RewardsDurationUpdated(uint256 _id, uint256 _rewardsDuration);

    constructor(
        address _parityToken,
        address _tokenParityStorage,
        address _managementParity,
        address _token,
        address _admin,
        address _treasury
    ) {
        require(_token != address(0), "Formation.Fi: zero address");
        require(_treasury != address(0), "Formation.Fi: zero address");
        require(_parityToken != address(0), "Formation.Fi: zero address");
        require(
            _tokenParityStorage != address(0),
            "Formation.Fi: zero address"
        );
        require(_managementParity != address(0), "Formation.Fi: zero address");
        require(_admin != address(0), "Formation.Fi: zero address");
        tokenParityStorage = _tokenParityStorage;
        parityToken = _parityToken;
        managementParity = _managementParity;
        token = _token;
        treasury = _treasury;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    modifier updateReward() {
        _updateReward();
        _;
    }

    function _updateReward() public {
        for (uint256 i = 0; i < packs.length; i++) {
            packs[i].rewardPerTokenStored = rewardPerToken(i);
            packs[i].lastUpdateTime = lastTimeReward(i);
        }
    }

    function _updateReward(uint256 tokenId_) public {
        for (uint256 i = 0; i < packs.length; i++) {
            rewards[i][tokenId_] += earned(i, tokenId_);
            rewardPerTokenPaid[i][tokenId_] = packs[i].rewardPerTokenStored;
        }
    }

    function getTokenIdsSize(address _user) external view returns (uint256) {
        return tokenIds[_user].length;
    }

    function setTotalSupply(
        uint256 _totalSupply
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        totalSupply = _totalSupply;
    }

    function setTreasury(
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "zero address");
        treasury = _treasury;
    }

    function addPack(
        address _rewardToken,
        uint256 _reward,
        uint256 _rewardDuration,
        uint256 _minBoostingFactor,
        uint256 _minAmount,
        ParityData.Amount memory _idealRatio,
        ParityData.Amount memory _idealAmount,
        ParityData.Amount memory _weights
    ) external onlyRole(MANAGER) {
        require(_reward != 0, "zero amount");
        uint256 _rewardPerSecond = _reward / _rewardDuration;
        uint256 _periodFinish = block.timestamp + _rewardDuration;
        packs.push(
            Pack(
                _rewardToken,
                _reward,
                _periodFinish,
                block.timestamp,
                _rewardDuration,
                _rewardPerSecond,
                0,
                _minBoostingFactor,
                _minAmount,
                _idealRatio,
                _idealAmount,
                _weights
            )
        );
        AssetTransfer.transferFrom(
            msg.sender,
            treasury,
            _reward,
            IERC20(_rewardToken)
        );
    }

    function updatePack(
        uint256 _id,
        uint256 _rewardDuration,
        uint256 _minBoostingFactor,
        uint256 _minAmount,
        ParityData.Amount memory _idealRatio,
        ParityData.Amount memory _idealAmount,
        ParityData.Amount memory _weights
    ) external onlyRole(MANAGER) {
        require(_id < packs.length, "Formation.Fi: no pack");
        require(
            packs[_id].rewardPerTokenStored == 0,
            "Formation.Fi: no update"
        );
        require(
            packs[_id].lastUpdateTime < block.timestamp,
            "Formation.Fi: out of time"
        );
        uint256 _rewardPerSecond = packs[_id].rewardTotal / _rewardDuration;
        uint256 _periodFinish = packs[_id].lastUpdateTime + _rewardDuration;
        packs[_id].rewardPerSecond = _rewardPerSecond;
        packs[_id].periodFinish = _periodFinish;
        packs[_id].rewardDuration = _rewardDuration;
        packs[_id].minBoostingFactor = _minBoostingFactor;
        packs[_id].minAmount = _minAmount;
        packs[_id].idealRatio = _idealRatio;
        packs[_id].idealAmount = _idealAmount;
        packs[_id].weights = _weights;
    }

    function lastTimeReward(uint256 _id) public view returns (uint256) {
        require(_id < packs.length, "Formation.Fi: no pack");
        uint256 _periodFinish = packs[_id].periodFinish;
        return
            block.timestamp < _periodFinish ? block.timestamp : _periodFinish;
    }

    function rewardPerToken(
        uint256 _id
    ) public view returns (uint256 _rewardPerTokenStored) {
        require(_id < packs.length, "Formation.Fi: no pack");
        Pack memory _pack = packs[_id];
        uint256 _totalValue = getTotalWeightedAmount(_id);
        if (_totalValue == 0) {
            _rewardPerTokenStored = _pack.rewardPerTokenStored;
        } else {
            _rewardPerTokenStored =
                _pack.rewardPerTokenStored +
                (((lastTimeReward(_id) - _pack.lastUpdateTime) *
                    _pack.rewardPerSecond) * ParityData.COEFF_SCALE_DECIMALS) /
                Math.max(_pack.minAmount, _totalValue);
        }
        return _rewardPerTokenStored;
    }

    function earned(
        uint256 _id,
        uint256 _tokenId
    ) public view returns (uint256) {
        require(_id < packs.length, "Formation.Fi: no pack");
        uint256 _value = getWeightedAmount(_id, _tokenId);
        return
            (boostingRewardFactor(_id, _tokenId) *
                (_value *
                    (rewardPerToken(_id) -
                        rewardPerTokenPaid[_id][_tokenId]))) /
            (ParityData.COEFF_SCALE_DECIMALS * ParityData.COEFF_SCALE_DECIMALS);
    }

    function stake(
        uint256 tokenId_,
        uint256 amount_,
        uint256 option_,
        address to_
    ) public whenNotPaused updateReward {
        require(to_ != address(0), "Formation.Fi: zero address");
        require((option_ >= 0) && (option_ <= 2), "Formation.Fi: out of range");
        require(tokenId_ != 0, "Formation.Fi: zero tokenId");
        _updateReward(tokenId_);
        if ((option_ == 1) || (option_ == 2)) {
            require(amount_ != 0, "Formation.Fi:  zero amount");
            require(
                ((holders[tokenId_] == msg.sender) ||
                    (IERC721(parityToken).ownerOf(tokenId_) == msg.sender)),
                "Formation.Fi: not owner"
            );

            balances[tokenId_] += amount_;
            totalSupply += amount_;
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount_);
        }
        if ((option_ == 0) || (option_ == 2)) {
            uint256 _size = tokenIds[to_].length;
            tokenIds[to_].push(tokenId_);
            indexes[tokenId_] = _size;
            holders[tokenId_] = to_;
            IERC721(parityToken).safeTransferFrom(
                msg.sender,
                address(this),
                tokenId_
            );
        }

        emit Staked(tokenId_, amount_, to_, option_);
    }

    function unstake(
        uint256 tokenId_,
        uint256 amount_,
        uint256 option_,
        address to_
    ) public whenNotPaused updateReward {
        require((option_ == 1) || (option_ == 2), "Formation.Fi: out of range");
        require(tokenId_ != 0, "Formation.Fi: amount is zero");
        _updateReward(tokenId_);
        require(
            ((holders[tokenId_] == msg.sender) ||
                (IERC721(parityToken).ownerOf(tokenId_) == msg.sender)),
            "Formation.Fi: not owner"
        );
        if (amount_ != 0) {
            require(
                balances[tokenId_] >= amount_,
                "Formation.Fi: ParityData.Amount is zero"
            );

            unchecked {
                totalSupply -= amount_;
            }
            unchecked {
                balances[tokenId_] -= amount_;
            }
            IERC20(token).safeTransfer(to_, amount_);
        }
        if (option_ == 2) {
            require(holders[tokenId_] == msg.sender, "Formation.Fi: no owner");
            require(balances[tokenId_] == 0, "FORM amount is not zero");
            _burn(tokenId_);
            holders[tokenId_] = address(0);
            IERC721(parityToken).safeTransferFrom(address(this), to_, tokenId_);
        }
        emit Unstaked(tokenId_, amount_, to_, option_);
    }

    function claim(uint256 tokenId_, address _to) public updateReward {
        uint256 _reward;
        _updateReward(tokenId_);
        require(
            ((holders[tokenId_] == msg.sender) ||
                (IERC721(parityToken).ownerOf(tokenId_) == msg.sender)),
            "Formation.Fi: not owner"
        );
        address _token;
        for (uint256 i = 0; i < packs.length; i++) {
            _reward = rewards[i][tokenId_];
            _token = packs[i].rewardToken;
            if (_reward > 0) {
                rewards[i][tokenId_] = 0;
                IERC20(_token).safeTransferFrom(treasury, _to, _reward);
                emit RewardPaid(_token, _reward, _to);
            }
        }
    }

    function exit(uint256 tokenId_, address _to) external {
        claim(tokenId_, _to);
        unstake(tokenId_, balances[tokenId_], 2, _to);
    }

    function boostingRewardFactor(
        uint256 _id,
        uint256 tokenId_
    ) public view returns (uint256 _factor) {
        require(_id < packs.length, "Formation.Fi: no pack");
        Pack memory _pack = packs[_id];
        ParityData.Amount memory _amount0 = ITokenParityStorage(
            tokenParityStorage
        ).tokenBalancePerToken(tokenId_);
        uint256 _amount1 = balances[tokenId_];
        ParityData.Amount memory _amount;
        ParityData.Amount memory _value;
        ParityData.Amount memory _weights = ITokenParityStorage(
            tokenParityStorage
        ).weightsPerToken(tokenId_);
        _amount.alpha =
            (_amount1 * _pack.weights.alpha) /
            ParityData.COEFF_SCALE_DECIMALS;
        _amount.beta =
            (_amount1 * _pack.weights.beta) /
            ParityData.COEFF_SCALE_DECIMALS;
        _amount.gamma =
            (_amount1 * _pack.weights.gamma) /
            ParityData.COEFF_SCALE_DECIMALS;
        _value.alpha = calculateFactor(
            _amount0.alpha,
            _amount.alpha,
            _pack.idealAmount.alpha,
            _pack.idealRatio.alpha
        );
        _value.beta = calculateFactor(
            _amount0.beta,
            _amount.beta,
            _pack.idealAmount.beta,
            _pack.idealRatio.beta
        );
        _value.gamma = calculateFactor(
            _amount0.gamma,
            _amount.gamma,
            _pack.idealAmount.gamma,
            _pack.idealRatio.gamma
        );
        _factor =
            (_weights.alpha *
                _value.alpha +
                _weights.beta *
                _value.beta +
                _weights.gamma *
                _value.gamma) /
            ParityData.COEFF_SCALE_DECIMALS;
        if (_amount1 >= _pack.minAmount) {
            _factor = Math.max(_factor, _pack.minBoostingFactor);
        }
    }

    function calculateFactor(
        uint256 _amount0,
        uint256 _amount1,
        uint256 _idealAmount,
        uint256 _idealRatio
    ) public pure returns (uint256 _factor) {
        if ((_amount0 == 0) || (_amount1 == 0)) {
            _factor = 0;
        } else {
            uint256 _ratio = (_amount0 * ParityData.COEFF_SCALE_DECIMALS) /
                _amount1;
            if ((_ratio <= _idealRatio) || (_amount1 >= _idealAmount)) {
                _factor = ParityData.COEFF_SCALE_DECIMALS;
            } else {
                _factor =
                    (_amount1 * ParityData.COEFF_SCALE_DECIMALS) /
                    _idealAmount;
            }
        }
    }

    function notifyRewardAmount(
        uint256 _id,
        uint256 _reward,
        uint256 _rewardsDuration
    ) external onlyRole(MANAGER) updateReward {
        _rewardsDuration = Math.max(
            _rewardsDuration,
            packs[_id].rewardDuration
        );
        require(_rewardsDuration != 0, "Formation.Fi: zero rewardsDuration");
        uint256 _rewardTotal = packs[_id].rewardTotal + _reward;
        packs[_id].rewardTotal = _rewardTotal;
        if (block.timestamp >= packs[_id].periodFinish) {
            packs[_id].rewardPerSecond = _reward / _rewardsDuration;
        } else {
            uint256 remaining = packs[_id].periodFinish - block.timestamp;
            uint256 leftover = remaining * packs[_id].rewardPerSecond;
            packs[_id].rewardPerSecond =
                (_reward + leftover) /
                _rewardsDuration;

            address _rewardToken = packs[_id].rewardToken;
            if (_reward != 0) {
                AssetTransfer.transferFrom(
                    msg.sender,
                    treasury,
                    _reward,
                    IERC20(_rewardToken)
                );
            }
            uint256 _balance = IERC20(_rewardToken).balanceOf(treasury);
            require(
                packs[_id].rewardPerSecond <= _balance / _rewardsDuration,
                "Formation.Fi: Provided reward too high"
            );
            packs[_id].periodFinish = block.timestamp + _rewardsDuration;
            packs[_id].rewardDuration = _rewardsDuration;
            packs[_id].lastUpdateTime = block.timestamp;
            emit RewardAdded(_id, _reward);
        }
    }

    function getWeightedAmount(
        uint256 _id,
        uint256 _tokenId
    ) public view returns (uint256 _weightedAmount) {
        Pack memory _pack = packs[_id];
        ParityData.Amount memory _amount = ITokenParityStorage(
            tokenParityStorage
        ).tokenBalancePerToken(_tokenId);
        _weightedAmount =
            (_amount.alpha *
                _pack.weights.alpha +
                _amount.beta *
                _pack.weights.beta +
                _amount.gamma *
                _pack.weights.gamma) /
            ParityData.COEFF_SCALE_DECIMALS;
    }

    function getTotalWeightedAmount(
        uint256 _id
    ) public view returns (uint256 _weightedAmount) {
        (
            IERC20 _tokenAlpha,
            IERC20 _tokenBeta,
            IERC20 _tokenGamma
        ) = IManagementParity(managementParity).getToken();
        Pack memory _pack = packs[_id];
        address _safeHouse = IManagementParity(managementParity).safeHouse();
        _weightedAmount =
            (_tokenAlpha.balanceOf(_safeHouse) *
                _pack.weights.alpha +
                _tokenBeta.balanceOf(_safeHouse) *
                _pack.weights.beta +
                _tokenGamma.balanceOf(_safeHouse) *
                _pack.weights.gamma) /
            ParityData.COEFF_SCALE_DECIMALS;
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function _burn(uint256 tokenId_) internal {
        address staker_ = holders[tokenId_];
        uint256 index_ = indexes[tokenId_];
        uint256 last_ = tokenIds[staker_].length - 1;
        uint256 id_ = tokenIds[staker_][last_];
        tokenIds[staker_][index_] = id_;
        indexes[id_] = index_;
        tokenIds[staker_].pop();
    }
}
