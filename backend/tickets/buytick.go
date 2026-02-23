package tickets

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func BuysTicket(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		type Request struct {
			TicketID string `json:"ticketId"`
			EventID  string `json:"eventId"`
			Quantity int    `json:"quantity"`
		}

		var req Request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.TicketID == "" || req.EventID == "" || req.Quantity <= 0 {
			http.Error(w, "Missing or invalid parameters", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		/* --------------------
		   Fetch ticket
		-------------------- */

		var ticket models.Ticket
		if err := app.DB.FindOne(
			ctx,
			ticketsCollection,
			bson.M{
				"ticketid": req.TicketID,
				"eventid":  req.EventID,
			},
			&ticket,
		); err != nil {
			http.Error(w, "Ticket not found", http.StatusNotFound)
			return
		}

		if ticket.Available < req.Quantity {
			http.Error(w, "Not enough tickets available", http.StatusBadRequest)
			return
		}

		/* --------------------
		   Update ticket counts
		-------------------- */

		update := bson.M{
			"$set": bson.M{
				"available": ticket.Available - req.Quantity,
				"sold":      ticket.Sold + req.Quantity,
				"updatedat": time.Now().UTC(),
			},
		}

		if err := app.DB.Update(
			ctx,
			ticketsCollection,
			bson.M{
				"ticketid": req.TicketID,
				"eventid":  req.EventID,
			},
			update,
		); err != nil {
			http.Error(w, "Failed to update ticket", http.StatusInternalServerError)
			return
		}

		/* --------------------
		   Create booking record
		-------------------- */

		booking := Ticking{
			BookingID: utils.GenerateRandomString(14),
			EventID:   req.EventID,
			TicketID:  req.TicketID,
			Quantity:  req.Quantity,
			BookedAt:  time.Now().UTC(),
		}

		if err := app.DB.Insert(
			ctx,
			bookingsCollection,
			booking,
		); err != nil {
			log.Println("warning: booking insert failed:", err)
		}

		/* --------------------
		   Track purchased ticket
		-------------------- */

		if err := app.DB.Insert(
			ctx,
			purchasedTicketsCollection,
			bson.M{
				"ticketid":  req.TicketID,
				"eventid":   req.EventID,
				"quantity":  req.Quantity,
				"purchased": time.Now().UTC(),
			},
		); err != nil {
			log.Println("warning: purchased ticket insert failed:", err)
		}

		/* --------------------
		   Response
		-------------------- */

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "Ticket booked successfully",
		})
	}
}

/* --------------------
   Booking Model
-------------------- */

type Ticking struct {
	BookingID string    `bson:"bookingid"`
	EventID   string    `bson:"eventid"`
	TicketID  string    `bson:"ticketid"`
	Quantity  int       `bson:"quantity"`
	BookedAt  time.Time `bson:"bookedat"`
}
