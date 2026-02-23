package musicon

import (
	"context"
	"naevis/infra"
	"naevis/infra/db"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// --------------------------- Recommendations ---------------------------

func GetRecommendedSongs(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		limit, page := getPaginationParams(r)
		opts := db.FindManyOptions{
			Limit: limit,
			Skip:  (page - 1) * limit,
			Sort:  map[string]int{"plays": -1}, // most played first
		}

		songs := []Song{} // always initialize to empty slice
		if err := app.DB.FindManyWithOptions(ctx, songsCollection, bson.M{"published": true}, opts, &songs); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch recommended songs")
			return
		}

		respondJSON(w, http.StatusOK, songs, "Recommended songs fetched")
	}
}

func GetRecommendedAlbums(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		limit, page := getPaginationParams(r)
		opts := db.FindManyOptions{
			Limit: limit,
			Skip:  (page - 1) * limit,
			Sort:  map[string]int{"release_date": -1}, // newest albums first
		}

		albums := []Album{} // always initialize to empty slice
		if err := app.DB.FindManyWithOptions(ctx, albumsCollection, bson.M{"published": true}, opts, &albums); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch recommended albums")
			return
		}

		respondJSON(w, http.StatusOK, albums, "Recommended albums fetched")
	}
}

func GetRecommendations(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		basedOn := strings.ToLower(r.URL.Query().Get("based_on"))
		filter := bson.M{"published": true}
		sort := map[string]int{}

		switch basedOn {
		case "recently_played":
			filter["plays"] = bson.M{"$gt": 0}
			sort["plays"] = -1
		case "language_en":
			filter["language"] = "en"
		case "genre_pop":
			filter["genre"] = "Pop"
		}

		limit, page := getPaginationParams(r)
		opts := db.FindManyOptions{
			Limit: limit,
			Skip:  (page - 1) * limit,
			Sort:  sort,
		}

		songs := []Song{} // always initialize to empty slice
		if err := app.DB.FindManyWithOptions(ctx, songsCollection, filter, opts, &songs); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch recommendations")
			return
		}

		respondJSON(w, http.StatusOK, songs, "Personalized recommendations fetched")
	}
}
