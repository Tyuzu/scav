Use a subscriber registry pattern.
Your current bootstrap still grows linearly with domains.

Instead of manually calling every registration function, define a common interface and auto-register them.

# Recommended Structure

```text id="y0kwu7"
/infra
    /mq
        /subscriber
            registry.go

            /auth
                subscriber.go

            /order
                subscriber.go

            /refund
                subscriber.go

/bootstrap
    subscribers.go
```

---

# 1. Define Subscriber Interface

## infra/mq/subscriber/registry.go

```go id="1ol0pw"
package subscriber

import (
	"context"

	"naevis/infra/mq"
)

type Subscriber interface {
	Register(
		ctx context.Context,
		bus mq.MQ,
	) error
}
```

---

# 2. Auth Subscriber

## infra/mq/subscriber/auth/subscriber.go

```go id="nwsbxu"
package auth

import (
	"context"

	"naevis/infra/mq"
)

type Subscriber struct{}

func New() *Subscriber {
	return &Subscriber{}
}

func (s *Subscriber) Register(
	ctx context.Context,
	bus mq.MQ,
) error {

	// register subscriptions here

	return nil
}
```

---

# 3. Order Subscriber

## infra/mq/subscriber/order/subscriber.go

```go id="ul9ajh"
package order

import (
	"context"

	"naevis/infra/mq"
)

type Subscriber struct{}

func New() *Subscriber {
	return &Subscriber{}
}

func (s *Subscriber) Register(
	ctx context.Context,
	bus mq.MQ,
) error {

	return nil
}
```

---

# 4. Clean Bootstrap

## bootstrap/subscribers.go

```go id="krtz2l"
package bootstrap

import (
	"context"

	authsub "naevis/infra/mq/subscriber/auth"
	ordersub "naevis/infra/mq/subscriber/order"
	refundsub "naevis/infra/mq/subscriber/refund"

	"naevis/infra"
	"naevis/infra/mq/subscriber"
)

func RegisterSubscribers(
	ctx context.Context,
	app *infra.Deps,
) error {

	subscribers := []subscriber.Subscriber{
		authsub.New(),
		ordersub.New(),
		refundsub.New(),
	}

	for _, sub := range subscribers {
		if err := sub.Register(ctx, app.MQ); err != nil {
			return err
		}
	}

	return nil
}
```

Now bootstrap complexity stays constant.

---

# 5. Why This Is Better

Instead of:

```go id="u8r67s"
RegisterAuthSubscribers(...)
RegisterOrderSubscribers(...)
RegisterRefundSubscribers(...)
RegisterListingSubscribers(...)
```

you now only add:

```go id="qhlh3z"
ordersub.New()
```

to a slice.

Much easier to maintain.

---

# 6. Even Better: Self-Contained Domain Modules

At larger scale:

```text id="jz9e2g"
/domain
    /auth
        handler.go
        service.go
        subscriber.go
        events.go

    /order
        handler.go
        service.go
        subscriber.go
        events.go
```

Each domain owns:

* http handlers
* event handlers
* services
* models
* events

instead of separating by technical concern.

This scales much better than:

```text id="08e4gc"
/handlers
/subscribers
/services
/models
```

for large systems.

---

# 7. Avoid Global Subscriber Packages

This is not ideal:

```text id="0f6kpn"
/subscriber
    auth.go
    order.go
```

because event logic gets detached from the domain it belongs to.

Prefer:

```text id="vrh1pd"
/domain/auth/subscriber.go
/domain/order/subscriber.go
```

Domain-oriented architecture scales better.

---

# 8. Final Recommended Architecture

For your current project size:

```text id="vknc4f"
/bootstrap
    subscribers.go

/domain
    /auth
        subscriber.go
        handler.go
        service.go

    /order
        subscriber.go

/infra
    /mq
```

This is maintainable for hundreds or thousands of events/subscribers.
