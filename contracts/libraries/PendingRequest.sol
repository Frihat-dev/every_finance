// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

struct PendingRequestData {
    uint256 lockedAmount;
    uint256 availableAmount;
    uint256 minPrice;
    uint256 maxPrice;
    uint256 eventId;
}

/**
 * @dev Implementation of the library PendingRequest that proposes functions to update for an investor a struct PendingRequestData.
 */
library PendingRequest {
    /**
     * @dev Modifier that checks if the new price bounds are valid.
     * It reverts when introducing new price bounds during a manager event validation.
     * It prevents the investor to modify the price bounds of his deposit/withdrawal request
     * during a manager event validation.
     */
    modifier CheckPrice(
        PendingRequestData storage request,
        uint256 minPrice_,
        uint256 maxPrice_,
        uint256 currentEventId_
    ) {
        if ((request.minPrice != 0) || (request.maxPrice != 0)) {
            if (currentEventId_ > request.eventId) {
                require(
                    (minPrice_ == request.minPrice) &&
                        (maxPrice_ == request.maxPrice),
                    "Every.finance: price don't match"
                );
            }
        }
        _;
    }

    /**
     * @dev Modifier that update for an investor his pending request data
     * to be synchronized with the current event id.
     */
    modifier syncWithEventId(
        PendingRequestData storage request,
        uint256 currentEventId_
    ) {
        if (currentEventId_ > request.eventId) {
            request.lockedAmount += request.availableAmount;
            request.availableAmount = 0;
            request.eventId = currentEventId_;
        }
        _;
    }

    /**
     * @dev increase a pending request `request` by `amount`.
     * This function is called when an investor makes a deposit/withdrawal request.
     * @param request  pending request.
     * @param amount_ amount to add.
     * @param minPrice_ minimum price of the yield-bearing token.
     * @param maxPrice_ maximum price  of the yield-bearing token
     * @param currentEventId_  id of the next manager event (process).
     */
    function increase(
        PendingRequestData storage request,
        uint256 amount_,
        uint256 minPrice_,
        uint256 maxPrice_,
        uint256 currentEventId_
    )
        internal
        CheckPrice(request, minPrice_, maxPrice_, currentEventId_)
        syncWithEventId(request, currentEventId_)
    {
        request.availableAmount += amount_;
        request.minPrice = minPrice_;
        request.maxPrice = maxPrice_;
    }

    /**
     * @dev decrease a pending request `request` by `amount`.
     * This function is called when an investor cancels a deposit/withdrawal request.
     * @param request  pending request.
     * @param amount_ amount to remove.
     * @param currentEventId_  id of the next manager event (process).
     */
    function decrease(
        PendingRequestData storage request,
        uint256 amount_,
        uint256 currentEventId_
    ) internal syncWithEventId(request, currentEventId_) {
        require(
            request.availableAmount >= amount_,
            "Every.finance: max amount"
        );
        unchecked {
            request.availableAmount -= amount_;
        }
    }

    /**
     * @dev update event Id
     *
     * @param request pending request.
     * @param currentEventId_  id of the next manager event (process).
     */
    function updateEventId(
        PendingRequestData storage request,
        uint256 currentEventId_
    ) internal {
        request.eventId = currentEventId_;
    }

    /**
     * @dev update the locked and available pending balances of `request` before the manager validation.
     * @param request pending request.
     * @param currentEventId_  id of the next manager event (process).
     */
    function preValidate(
        PendingRequestData storage request,
        uint256 currentEventId_
    ) internal syncWithEventId(request, currentEventId_) {}

    /**
     * @dev decrease the locked pending balance of `request` after the manager validation by `amount`.
     * @param request pending request.
     * @param currentEventId_  id of the next manager event (process).
     */
    function validate(
        PendingRequestData storage request,
        uint256 amount_,
        uint256 currentEventId_
    ) internal syncWithEventId(request, currentEventId_) {
        require(
            request.lockedAmount >= amount_,
            "Every.finance: max amount"
        );
        unchecked {
            request.lockedAmount -= amount_;
        }
    }
}
