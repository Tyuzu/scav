package artists

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/dels"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

func CreateArtist(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			utils.RespondWithError(
				w,
				http.StatusBadRequest,
				"Failed to parse form data",
			)
			return
		}

		artist, _, _, err := parseArtistFormData(r, nil)
		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				err.Error(),
			)
			return
		}

		artist.ArtistID = utils.GenerateRandomString(12)
		artist.EventIDs = []string{}

		if err := app.DB.Insert(
			ctx,
			ArtistsCollection,
			artist,
		); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to create artist",
			)
			return
		}

		artistPayload := mqevent.ArtistCreatedPayload{
			ArtistID:   artist.ArtistID,
			UserID:     artist.CreatorID,
			ArtistName: artist.Name,
			OccurredAt: time.Now(),
		}

		artistBytes, err := json.Marshal(artistPayload)

		if err == nil {
			publishCtx, cancel := context.WithTimeout(
				context.Background(),
				3*time.Second,
			)
			defer cancel()

			_ = app.MQ.Publish(
				publishCtx,
				mqevent.ArtistCreated,
				artistBytes,
			)
		}

		utils.RespondWithJSON(w, http.StatusCreated, artist)
	}
}

func UpdateArtist(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		idParam := ps.ByName("id")

		if err := r.ParseMultipartForm(20 << 20); err != nil {
			utils.RespondWithError(
				w,
				http.StatusBadRequest,
				"Failed to parse form data",
			)
			return
		}

		var existing models.Artist

		if err := app.DB.FindOne(
			ctx,
			ArtistsCollection,
			map[string]any{
				"artistid": idParam,
			},
			&existing,
		); err != nil {
			utils.RespondWithError(
				w,
				http.StatusNotFound,
				"Artist not found",
			)
			return
		}

		updated, updateData, filesToDelete, err := parseArtistFormData(
			r,
			&existing,
		)
		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				err.Error(),
			)
			return
		}

		_ = updated

		if len(updateData) == 0 {
			utils.RespondWithJSON(w, http.StatusOK, map[string]any{
				"message": "No changes detected",
			})
			return
		}

		err = app.DB.Update(
			ctx,
			ArtistsCollection,
			map[string]any{
				"artistid": idParam,
			},
			map[string]any{
				"$set": updateData,
			},
		)
		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to update artist",
			)
			return
		}

		for _, path := range filesToDelete {
			_ = os.Remove(path)
		}

		updatePayload := mqevent.ArtistUpdatedPayload{
			ArtistID:   idParam,
			UserID:     existing.CreatorID,
			OccurredAt: time.Now(),
		}

		updateBytes, err := json.Marshal(updatePayload)

		if err == nil {
			publishCtx, cancel := context.WithTimeout(
				context.Background(),
				3*time.Second,
			)
			defer cancel()

			_ = app.MQ.Publish(
				publishCtx,
				mqevent.ArtistUpdated,
				updateBytes,
			)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Artist updated",
		})
	}
}

func parseArtistFormData(
	r *http.Request,
	existing *models.Artist,
) (models.Artist, map[string]any, []string, error) {

	var artist models.Artist

	updateData := map[string]any{}
	filesToDelete := []string{}

	if existing != nil {
		artist.ArtistID = existing.ArtistID
		artist.EventIDs = existing.EventIDs
	}

	assignField := func(
		key string,
		target *string,
		existingVal string,
	) {
		if val := r.FormValue(key); val != "" {
			*target = val
			updateData[key] = val
		} else {
			*target = existingVal
		}
	}

	assignField("name", &artist.Name, existingValue(existing, "Name"))
	assignField("bio", &artist.Bio, existingValue(existing, "Bio"))
	assignField("category", &artist.Category, existingValue(existing, "Category"))
	assignField("dob", &artist.DOB, existingValue(existing, "DOB"))
	assignField("place", &artist.Place, existingValue(existing, "Place"))
	assignField("country", &artist.Country, existingValue(existing, "Country"))

	artist.CreatorID = utils.GetUserIDFromRequest(r)

	if artist.CreatorID != "" {
		updateData["creatorid"] = artist.CreatorID
	} else if existing != nil {
		artist.CreatorID = existing.CreatorID
	}

	if val := r.FormValue("genres"); val != "" {
		var genres []string

		for _, g := range strings.Split(val, ",") {
			if g = strings.TrimSpace(g); g != "" {
				genres = append(genres, g)
			}
		}

		artist.Genres = genres
		updateData["genres"] = genres

	} else if existing != nil {
		artist.Genres = existing.Genres
	}

	if val := r.FormValue("socials"); val != "" {
		var socials map[string]string

		if err := json.Unmarshal([]byte(val), &socials); err == nil {
			artist.Socials = socials
			updateData["socials"] = socials
		} else {
			artist.Socials = map[string]string{
				"raw": val,
			}
			updateData["socials"] = artist.Socials
		}

	} else if existing != nil {
		artist.Socials = existing.Socials
	}

	if existing != nil {
		artist.Members = existing.Members
	}

	return artist, updateData, filesToDelete, nil
}

func DeleteArtistByID(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dels.DeleteArtistByID(app)
	}
}

func existingValue(existing *models.Artist, field string) string {
	if existing == nil {
		return ""
	}

	switch field {

	case "Name":
		return existing.Name

	case "Bio":
		return existing.Bio

	case "Category":
		return existing.Category

	case "DOB":
		return existing.DOB

	case "Place":
		return existing.Place

	case "Country":
		return existing.Country

	case "Banner":
		return existing.Banner

	case "Photo":
		return existing.Photo

	default:
		return ""
	}
}
