from datetime import datetime, timezone
from typing import Dict, Any, Set



VALID_STATES = {"trial", "active", "paused", "past_due", "cancelled"}


ALLOWED_TRANSITIONS: Dict[str, Set[str]] = {
    "trial": {"active", "cancelled"},
    "active": {"paused", "past_due", "cancelled"},
    "paused": {"active", "cancelled"},
    "past_due": {"active", "cancelled"},
    "cancelled": set()  
}

class InvalidStateTransitionError(Exception):
    """Raised when an illegal status change is attempted."""
    pass


def transition_subscription_status(subscription, new_status: str):
    """
    Validates and performs a status transition for a subscription.
    Works with SQLAlchemy ORM objects directly.
    """
    current_status = subscription.status

   
    if new_status not in VALID_STATES:
        raise ValueError(f"Invalid target state: '{new_status}'. Allowed states are {VALID_STATES}")

    
    if current_status == new_status:
        raise InvalidStateTransitionError(f"Subscription is already in '{current_status}' state.")

    allowed_next_states = ALLOWED_TRANSITIONS.get(current_status, set())
    
    if new_status not in allowed_next_states:
        raise InvalidStateTransitionError(
            f"Cannot transition subscription from '{current_status}' to '{new_status}'. "
            f"Allowed transitions from '{current_status}': {allowed_next_states or 'None'}"
        )

    from datetime import datetime, timezone
    subscription.status = new_status
    subscription.status_updated_at = datetime.now(timezone.utc)

    return subscription

InvalidTransitionError = InvalidStateTransitionError
VALID_TRANSITIONS = ALLOWED_TRANSITIONS