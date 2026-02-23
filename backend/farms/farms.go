package farms

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/globals"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// --------------------------------------------------
// Create
// --------------------------------------------------

func CreateFarm(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Failed to parse form",
			})
			return
		}

		requestingUserID, ok := ctx.Value(globals.UserIDKey).(string)
		if !ok {
			http.Error(w, "Invalid user", http.StatusBadRequest)
			return
		}

		farm := models.Farm{
			FarmID:             utils.GenerateRandomString(14),
			Name:               r.FormValue("name"),
			Location:           r.FormValue("location"),
			Description:        r.FormValue("description"),
			Owner:              r.FormValue("owner"),
			Contact:            r.FormValue("contact"),
			AvailabilityTiming: r.FormValue("availabilityTiming"),
			Crops:              []models.Crop{},
			CreatedBy:          requestingUserID,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		if farm.Name == "" || farm.Location == "" || farm.Owner == "" || farm.Contact == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Missing required fields",
			})
			return
		}

		if err := app.DB.InsertOne(ctx, farmsCollection, farm); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to insert farm",
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"id":      farm.FarmID,
		})
	}
}

// --------------------------------------------------
// Edit
// --------------------------------------------------

func EditFarm(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		farmID := ps.ByName("id")

		if farmID == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Missing farm id",
			})
			return
		}

		if _, ok := ctx.Value(globals.UserIDKey).(string); !ok {
			http.Error(w, "Invalid user", http.StatusBadRequest)
			return
		}

		update := bson.M{}
		contentType := r.Header.Get("Content-Type")

		var input models.Farm

		if strings.HasPrefix(contentType, "multipart/form-data") {
			if err := r.ParseMultipartForm(10 << 20); err != nil {
				utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
					"success": false,
					"message": "Malformed multipart data",
				})
				return
			}

			input.Name = r.FormValue("name")
			input.Location = r.FormValue("location")
			input.Description = r.FormValue("description")
			input.Owner = r.FormValue("owner")
			input.Contact = r.FormValue("contact")
			input.AvailabilityTiming = r.FormValue("availabilityTiming")
		} else {
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
					"success": false,
					"message": "Invalid JSON body",
				})
				return
			}
		}

		if input.Name != "" {
			update["name"] = input.Name
		}
		if input.Location != "" {
			update["location"] = input.Location
		}
		if input.Description != "" {
			update["description"] = input.Description
		}
		if input.Owner != "" {
			update["owner"] = input.Owner
		}
		if input.Contact != "" {
			update["contact"] = input.Contact
		}
		if input.AvailabilityTiming != "" {
			update["availabilityTiming"] = input.AvailabilityTiming
		}

		if len(update) == 0 {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "No fields to update",
			})
			return
		}

		update["updatedAt"] = time.Now()

		if err := app.DB.UpdateOne(
			ctx,
			farmsCollection,
			bson.M{"farmid": farmID},
			bson.M{"$set": update},
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Database error",
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"message": "Farm updated",
		})
	}
}

// --------------------------------------------------
// Delete
// --------------------------------------------------

func DeleteFarm(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		farmID := ps.ByName("id")

		if farmID == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Missing farm id",
			})
			return
		}

		if _, ok := ctx.Value(globals.UserIDKey).(string); !ok {
			http.Error(w, "Invalid user", http.StatusBadRequest)
			return
		}

		if err := app.DB.DeleteOne(ctx, farmsCollection, bson.M{"farmid": farmID}); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
		})
	}
}
