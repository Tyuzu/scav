package models

type WeatherResponse struct {
	Location  string  `json:"location"`
	Icon      string  `json:"icon"`
	AirTemp   float64 `json:"airTemp"`
	Humidity  int     `json:"humidity"`
	WindSpeed float64 `json:"windSpeed"`
	SoilTemp  float64 `json:"soilTemp"`
	Rain24h   float64 `json:"rain24h"`
}
