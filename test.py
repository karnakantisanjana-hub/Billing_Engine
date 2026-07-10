class DummySubscription:
    def __init__(self, status):
        self.status = status
        self.status_updated_at = None


from app.services.subscription_services import change_status

subscription = DummySubscription("trial")

change_status(subscription, "active")

print(subscription.status)
print(subscription.status_updated_at)