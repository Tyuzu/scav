package farms

import (
	"net/http"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

func GetWeather(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {

		response := models.WeatherResponse{
			Location:  "Farm — NYC",
			Icon:      "🌤️",
			AirTemp:   28.6,
			Humidity:  65,
			WindSpeed: 12,
			SoilTemp:  22.3,
			Rain24h:   2,
		}

		utils.RespondWithJSON(w, http.StatusOK, response)
	}
}
