from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Subscription

VALID_TRANSITIONS = {
    "trial":      ["active", "cancelled"],
    "active":     ["past_due", "cancelled", "paused"],
    "past_due":   ["active", "cancelled"],
    "paused":     ["active", "cancelled"],
    "cancelled":  []
}


class InvalidTransitionError(Exception):
    pass


def transition_subscription_status(db: Session, subscription: Subscription, new_status: str) -> Subscription:
    """
    Validates and applies a subscription status transition.
    Raises InvalidTransitionError if the transition isn't allowed.
    """
    current_status = subscription.status

    if new_status == current_status:
        raise InvalidTransitionError(f"Subscription is already '{current_status}'")

    allowed = VALID_TRANSITIONS.get(current_status, [])

    if new_status not in allowed:
        raise InvalidTransitionError(
            f"Cannot transition from '{current_status}' to '{new_status}'. "
            f"Allowed next states: {allowed if allowed else 'none (terminal state)'}"
        )

    subscription.status = new_status
    subscription.status_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(subscription)

    return subscription