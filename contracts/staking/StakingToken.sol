// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract StakingToken is Ownable, Pausable {
    using Math for uint256;
    using SafeERC20 for IERC20;
    uint256 public constant COEFF_SCALE_DECIMALS = 1e18;

    struct Pack {
        address rewardToken;
        uint256 rewardTotal;
        uint256 startTime;
        uint256 periodFinish;
        uint256 lastUpdateTime;
        uint256 rewardDuration;
        uint256 rewardPerSecond;
        uint256 rewardPerTokenStored;
        uint256 minBoostingFactor;
        uint256 minTotalSupply;
    }
    struct Balance {
        uint256 amount0;
        uint256 amount1;
    }

    uint256 public ratio;
    uint256 public idealAmount;
    address public treasury;
    Balance private totalSupply;
    Pack[] public packs;
    mapping(uint256 => mapping(address => uint256)) public rewardPerTokenPaid;
    mapping(uint256 => mapping(address => uint256)) public rewards;
    mapping(address => Balance) private balances;
    IERC20 public token0;
    IERC20 public token1;

    event Staked(uint256 _amount0, uint256 _amount1, address indexed _to);
    event Unstaked(uint256 _amount0, uint256 _amount1, address indexed _to);
    event RewardPaid(
        address indexed _rewardToken,
        uint256 _reward,
        address indexed _to
    );
    event RewardAdded(uint256 _id, uint256 _reward);
    event RewardsDurationUpdated(uint256 _id, uint256 _rewardsDuration);

    constructor(address _token0, address _token1, address _treasury) {
        require(_token0 != address(0), "Formation.Fi: zero address");
        require(_token1 != address(0), "Formation.Fi: zero address");
        require(_treasury != address(0), "Formation.Fi: zero address");
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        treasury = _treasury;
    }

    modifier updateReward() {
        for (uint256 i = 0; i < packs.length; i++) {
            packs[i].rewardPerTokenStored = rewardPerToken(i);
            packs[i].lastUpdateTime = lastTimeReward(i);
        }
        _;
    }

    function _updateReward(address _to) internal {
        for (uint256 i = 0; i < packs.length; i++) {
            rewards[i][_to] += earned(i, _to);
            rewardPerTokenPaid[i][_to] = packs[i].rewardPerTokenStored;
        }
    }

    function setTotalSupply(Balance memory _totalSupply) external onlyOwner {
        totalSupply = _totalSupply;
    }

    function setRatio(uint256 _ratio) external onlyOwner {
        ratio = _ratio;
    }

    function setIdealAmount(uint256 _amount) external onlyOwner {
        idealAmount = _amount;
    }

    function addPack(
        address _rewardToken,
        uint256 _startTime,
        uint256 _rewardDuration,
        uint256 _minBoostingFactor,
        uint256 _minTotalSupply
    ) external onlyOwner {
        packs.push(
            Pack(
                _rewardToken,
                0,
                _startTime,
                0,
                0,
                _rewardDuration,
                0,
                0,
                _minBoostingFactor,
                _minTotalSupply
            )
        );
    }

    function updateRewardDuration(
        uint256 _id,
        uint256 _rewardDuration
    ) external onlyOwner {
        require(_id < packs.length, "Formation.Fi: no pack");
        packs[_id].rewardDuration = _rewardDuration;
    }

    function getTotalSupply() external view returns (Balance memory) {
        return totalSupply;
    }

    function balanceOf(
        address _account
    ) external view returns (Balance memory) {
        return balances[_account];
    }

    function lastTimeReward(uint256 _id) public view returns (uint256) {
        require(_id < packs.length, "Formation.Fi: no pack");
        uint256 _periodFinish = packs[_id].periodFinish;
        return
            block.timestamp < _periodFinish ? block.timestamp : _periodFinish;
    }

    function rewardPerToken(uint256 _id) public view returns (uint256) {
        require(_id < packs.length, "Formation.Fi: no pack");
        Pack memory _pack = packs[_id];
        if (totalSupply.amount0 == 0) {
            return _pack.rewardPerTokenStored;
        }
        return
            _pack.rewardPerTokenStored +
            (((lastTimeReward(_id) - _pack.lastUpdateTime) *
                _pack.rewardPerSecond) * COEFF_SCALE_DECIMALS) /
            Math.max(totalSupply.amount0, _pack.minTotalSupply);
    }

    function earned(uint256 _id, address _to) public view returns (uint256) {
        require(_id < packs.length, "Formation.Fi: no pack");
        return
            (Math.max(packs[_id].minBoostingFactor, boostingRewardFactor(_to)) *
                (balances[_to].amount0 *
                    (rewardPerToken(_id) - rewardPerTokenPaid[_id][_to]))) /
            (COEFF_SCALE_DECIMALS * COEFF_SCALE_DECIMALS);
    }

    function stake(
        uint256 _amount0,
        uint256 _amount1,
        address _to
    ) public whenNotPaused updateReward {
        require(_to != address(0), "Formation.Fi: zero address");
        require(
            (_amount0 != 0) || (_amount1 != 0),
            "Formation.Fi: amount is zero"
        );
        _updateReward(_to);
        if (_amount0 != 0) {
            totalSupply.amount0 += _amount0;
            balances[_to].amount0 += _amount0;
            token0.safeTransferFrom(msg.sender, address(this), _amount0);
        }
        if (_amount1 != 0) {
            totalSupply.amount1 += _amount1;
            balances[_to].amount1 += _amount1;
            token1.safeTransferFrom(msg.sender, address(this), _amount1);
        }
        emit Staked(_amount0, _amount1, _to);
    }

    function unstake(
        uint256 _amount0,
        uint256 _amount1,
        address _to
    ) public whenNotPaused updateReward {
        require(_amount0 != 0 || _amount1 != 0, "Formation.Fi: amount is zero");

        _updateReward(msg.sender);
        if (_amount0 != 0) {
            require(
                balances[msg.sender].amount0 >= _amount0,
                "Formation.Fi: amount is zero"
            );

            unchecked {
                totalSupply.amount0 -= _amount0;
            }
            unchecked {
                balances[msg.sender].amount0 -= _amount0;
            }
            token0.safeTransfer(_to, _amount0);
        }

        if (_amount1 != 0) {
            require(
                balances[msg.sender].amount1 >= _amount1,
                "Formation.Fi: amount is zero"
            );

            unchecked {
                totalSupply.amount1 -= _amount1;
            }
            unchecked {
                balances[msg.sender].amount1 -= _amount1;
            }
            token0.safeTransfer(_to, _amount1);
        }
        emit Unstaked(_amount0, _amount1, msg.sender);
    }

    function claim(address _to) public updateReward {
        uint256 _reward;
        _updateReward(_to);
        for (uint256 i = 0; i < packs.length; i++) {
            _reward = rewards[i][msg.sender];
            if (_reward > 0) {
                rewards[i][msg.sender] = 0;
                IERC20(packs[i].rewardToken).safeTransferFrom(
                    treasury,
                    _to,
                    _reward
                );
                emit RewardPaid(packs[i].rewardToken, _reward, msg.sender);
            }
        }
    }

    function exit(address _to) external {
        unstake(
            balances[msg.sender].amount0,
            balances[msg.sender].amount1,
            _to
        );
        claim(_to);
    }

    function supplyTokenReward(
        uint256 _id,
        uint256 _amountToken
    ) external onlyOwner {
        packs[_id].rewardTotal += _amountToken;
        IERC20(packs[_id].rewardToken).transferFrom(
            msg.sender,
            treasury,
            _amountToken
        );
    }

    function boostingRewardFactor(
        address _to
    ) public view returns (uint256 _factor) {
        uint256 _amount0 = balances[_to].amount0;
        uint256 _amount1 = balances[_to].amount1;
        Balance memory _ratio;
        _ratio.amount0 = (_amount0 * COEFF_SCALE_DECIMALS) / _amount1;
        _ratio.amount1 = (_amount1 * COEFF_SCALE_DECIMALS) / idealAmount;
        uint256 _maxRatio = Math.max(_ratio.amount0, _ratio.amount1);
        if (_maxRatio <= ratio) {
            _factor = _maxRatio;
        } else {
            _factor = COEFF_SCALE_DECIMALS;
        }
    }

    function notifyRewardAmount(
        uint256 _id,
        uint256 _reward,
        uint256 _rewardsDuration
    ) external updateReward {
        _rewardsDuration = Math.max(
            _rewardsDuration,
            packs[_id].rewardDuration
        );
        require(_rewardsDuration > 0, "Formation.Fi: zero rewardsDuration");
        packs[_id].rewardTotal += _reward;
        if (block.timestamp >= packs[_id].periodFinish) {
            packs[_id].rewardPerSecond = _reward / _rewardsDuration;
        } else {
            uint256 remaining = packs[_id].periodFinish - block.timestamp;
            uint256 leftover = remaining * packs[_id].rewardPerSecond;
            packs[_id].rewardPerSecond =
                (_reward + leftover) /
                _rewardsDuration;

            address _rewardToken = packs[_id].rewardToken;
            IERC20(_rewardToken).transferFrom(msg.sender, treasury, _reward);
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

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
