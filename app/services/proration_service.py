from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models import Subscription, Plan

def calculate_proration_credit(db: Session, subscription: Subscription, new_plan: Plan) -> dict:
    """
    Calculates remaining credit from the current billing cycle 
    and determines the net amount due for the new plan choice.
    """
    current_plan = subscription.plan
    today = date.today()
    
    
    cycle_length = 30
    start_date = subscription.start_date or today
    days_used = (today - start_date).days
    
    
    days_used = max(0, min(days_used, cycle_length))
    days_remaining = cycle_length - days_used
    
  
    current_plan_daily_rate = float(current_plan.price) / cycle_length
    remaining_credit = round(current_plan_daily_rate * days_remaining, 2)
    
    
    new_plan_price = float(new_plan.price)
    amount_due = max(0.0, round(new_plan_price - remaining_credit, 2))
    
    return {
        "current_plan_name": current_plan.name,
        "new_plan_name": new_plan.name,
        "remaining_credit": remaining_credit,
        "amount_due": amount_due,
        "days_remaining": days_remaining
    }