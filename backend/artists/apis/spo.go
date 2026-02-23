package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

/* -------------------- Models -------------------- */

type Artist struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Genres    []string `json:"genres"`
	Followers struct {
		Total int `json:"total"`
	} `json:"followers"`
}

type Track struct {
	Name       string `json:"name"`
	ID         string `json:"id"`
	PreviewURL string `json:"preview_url"`
	AlbumID    string `json:"album_id,omitempty"`
	AlbumName  string `json:"album_name,omitempty"`
}

type Image struct {
	Height int    `json:"height"`
	Width  int    `json:"width"`
	URL    string `json:"url"`
}

type Album struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Type      string  `json:"album_type"`
	Images    []Image `json:"images"`
	ImageFile string  `json:"image_file,omitempty"` // local filename after download
	Tracks    []Track `json:"tracks"`
}

type ArtistProfile struct {
	Artist    Artist  `json:"artist"`
	TopTracks []Track `json:"top_tracks"`
	Albums    []Album `json:"albums"`
	AllTracks []Track `json:"all_tracks"`
}

/* -------------------- Spotify paging wrappers -------------------- */

type AlbumsPage struct {
	Items []struct {
		ID        string  `json:"id"`
		Name      string  `json:"name"`
		AlbumType string  `json:"album_type"`
		Images    []Image `json:"images"`
	} `json:"items"`
	Next  string `json:"next"`
	Total int    `json:"total"`
}

type MultipleAlbums struct {
	Albums []struct {
		ID        string  `json:"id"`
		Name      string  `json:"name"`
		AlbumType string  `json:"album_type"`
		Images    []Image `json:"images"`
		Tracks    struct {
			Items []struct {
				ID         string `json:"id"`
				Name       string `json:"name"`
				PreviewURL string `json:"preview_url"`
			} `json:"items"`
		} `json:"tracks"`
	} `json:"albums"`
}

/* -------------------- Token -------------------- */

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func getSpotifyToken(clientID, clientSecret string) (string, error) {
	data := url.Values{}
	data.Set("grant_type", "client_credentials")

	req, _ := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	auth := base64.StdEncoding.EncodeToString([]byte(clientID + ":" + clientSecret))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request returned %d: %s", resp.StatusCode, string(body))
	}

	var t tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&t); err != nil {
		return "", fmt.Errorf("token decode failed: %w", err)
	}
	return t.AccessToken, nil
}

/* -------------------- HTTP helpers with rate-limit/backoff -------------------- */

// basic GET with retries and 429 handling. Returns error if final attempt fails.
func spotifyGetWithBackoff(endpoint string, params map[string]string, token string, target interface{}) error {
	u, _ := url.Parse("https://api.spotify.com/v1/" + endpoint)
	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	maxRetries := 6
	var lastErr error
	backoffBase := time.Second

	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, _ := http.NewRequest("GET", u.String(), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			log.Printf("[attempt %d] error: %v", attempt+1, lastErr)
		} else {
			// always close body once handled
			func() {
				defer resp.Body.Close()

				// Rate limit
				if resp.StatusCode == 429 {
					retryAfter := 1
					if ra := resp.Header.Get("Retry-After"); ra != "" {
						if v, e := strconv.Atoi(ra); e == nil {
							retryAfter = v
						}
					}
					log.Printf("[attempt %d] received 429. Retry-After: %d seconds. Sleeping...", attempt+1, retryAfter)
					time.Sleep(time.Duration(retryAfter+1) * time.Second)
					lastErr = fmt.Errorf("rate limited 429")
					return
				}

				// Acceptable error codes -> retry with backoff
				if resp.StatusCode < 200 || resp.StatusCode >= 300 {
					body, _ := io.ReadAll(resp.Body)
					lastErr = fmt.Errorf("spotify returned %d: %s", resp.StatusCode, string(body))
					log.Printf("[attempt %d] spotify returned %d", attempt+1, resp.StatusCode)
					// exponential backoff below
					return
				}

				// success
				decErr := json.NewDecoder(resp.Body).Decode(target)
				if decErr != nil {
					lastErr = fmt.Errorf("json decode failed: %w", decErr)
					log.Printf("[attempt %d] json decode failed: %v", attempt+1, decErr)
					return
				}
				lastErr = nil
			}()
		}

		if lastErr == nil {
			return nil
		}

		// backoff (exponential + jitter)
		sleep := backoffBase * time.Duration(1<<attempt)
		if sleep > 60*time.Second {
			sleep = 60 * time.Second
		}
		jitter := time.Duration((attempt % 3)) * 250 * time.Millisecond
		log.Printf("Backing off %s (attempt %d/%d)...", sleep+jitter, attempt+1, maxRetries+1)
		time.Sleep(sleep + jitter)
	}

	return fmt.Errorf("all attempts failed: %w", lastErr)
}

/* -------------------- Album paging & batching -------------------- */

// Fetch all albums/singles/compilations (paginated via artists/{id}/albums).
// Deduplicates by name+type and returns unique []Album (without tracks populated).
func fetchAllAlbums(artistID, token string) ([]Album, error) {
	log.Println("Fetching album list (albums, singles, compilations)...")
	albums := []Album{}
	limit := 50
	offset := 0

	for {
		params := map[string]string{
			"market":         "US",
			"include_groups": "album,single,compilation",
			"limit":          strconv.Itoa(limit),
			"offset":         strconv.Itoa(offset),
		}
		var page AlbumsPage
		if err := spotifyGetWithBackoff(fmt.Sprintf("artists/%s/albums", artistID), params, token, &page); err != nil {
			return nil, fmt.Errorf("fetch albums page failed: %w", err)
		}

		for _, it := range page.Items {
			albums = append(albums, Album{
				ID:     it.ID,
				Name:   it.Name,
				Type:   it.AlbumType,
				Images: it.Images,
				Tracks: nil, // will fill later via batch
			})
		}

		log.Printf("Collected %d album entries so far...", len(albums))
		if page.Next == "" {
			break
		}
		offset += limit
		// small pause to be polite
		time.Sleep(250 * time.Millisecond)
	}

	// Deduplicate by name+type (lowercase)
	uniqueMap := map[string]Album{}
	for _, a := range albums {
		key := strings.ToLower(strings.TrimSpace(a.Name)) + "::" + strings.ToLower(strings.TrimSpace(a.Type))
		// prefer earlier entry (Spotify sometimes returns duplicates)
		if _, exists := uniqueMap[key]; !exists {
			uniqueMap[key] = a
		}
	}

	result := make([]Album, 0, len(uniqueMap))
	for _, a := range uniqueMap {
		result = append(result, a)
	}
	log.Printf("Unique albums after dedupe: %d", len(result))
	return result, nil
}

// Fetch tracks & images for batches of album IDs using /albums?ids=...
// Returns map[albumID] -> Album (with Tracks and Images populated).
func fetchAlbumsBatch(albumIDs []string, token string) (map[string]Album, error) {
	res := map[string]Album{}
	const batchSize = 20

	for i := 0; i < len(albumIDs); i += batchSize {
		end := i + batchSize
		if end > len(albumIDs) {
			end = len(albumIDs)
		}
		batch := albumIDs[i:end]
		params := map[string]string{"ids": strings.Join(batch, ",")}

		var multi MultipleAlbums
		if err := spotifyGetWithBackoff("albums", params, token, &multi); err != nil {
			// on batch failure, try per-album fallback to avoid losing data
			log.Printf("Batch fetch failed for batch %d..%d: %v", i, end-1, err)
			for _, aid := range batch {
				// fetch single album with retry
				var single MultipleAlbums
				if sgErr := spotifyGetWithBackoff("albums", map[string]string{"ids": aid}, token, &single); sgErr != nil {
					log.Printf("Failed to fetch album %s individually: %v", aid, sgErr)
					continue
				}
				for _, a := range single.Albums {
					al := Album{
						ID:     a.ID,
						Name:   a.Name,
						Type:   a.AlbumType,
						Images: a.Images,
					}
					for _, t := range a.Tracks.Items {
						al.Tracks = append(al.Tracks, Track{
							ID:         t.ID,
							Name:       t.Name,
							PreviewURL: t.PreviewURL,
							AlbumID:    a.ID,
							AlbumName:  a.Name,
						})
					}
					res[a.ID] = al
				}
				time.Sleep(200 * time.Millisecond)
			}
			continue
		}

		// success: process multi.Albums
		for _, a := range multi.Albums {
			al := Album{
				ID:     a.ID,
				Name:   a.Name,
				Type:   a.AlbumType,
				Images: a.Images,
			}
			for _, t := range a.Tracks.Items {
				al.Tracks = append(al.Tracks, Track{
					ID:         t.ID,
					Name:       t.Name,
					PreviewURL: t.PreviewURL,
					AlbumID:    a.ID,
					AlbumName:  a.Name,
				})
			}
			res[a.ID] = al
			log.Printf("Batch fetched album: %s (%d tracks)", a.Name, len(al.Tracks))
		}

		// polite pause
		time.Sleep(300 * time.Millisecond)
	}

	return res, nil
}

/* -------------------- Download helpers -------------------- */

func sanitizeFileName(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "_")
	// remove characters not suitable for filenames
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-' || r == '.' {
			return r
		}
		return -1
	}, s)
	if s == "" {
		return "file"
	}
	return s
}

// download image with retries and rate-limit handling
func downloadFileWithRetry(urlStr, dest string, token string) error {
	maxRetries := 6
	backoffBase := time.Second
	_ = token

	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, _ := http.NewRequest("GET", urlStr, nil)
		// images are public; no need for auth header, but include a User-Agent
		req.Header.Set("User-Agent", "spotify-scraper/1.0")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Printf("image request failed (attempt %d): %v", attempt+1, err)
			// backoff below
		} else {
			func() {
				defer resp.Body.Close()
				if resp.StatusCode == 429 {
					retryAfter := 1
					if ra := resp.Header.Get("Retry-After"); ra != "" {
						if v, e := strconv.Atoi(ra); e == nil {
							retryAfter = v
						}
					}
					log.Printf("Image download rate limited. Retry-After=%d", retryAfter)
					time.Sleep(time.Duration(retryAfter+1) * time.Second)
					return
				}
				if resp.StatusCode < 200 || resp.StatusCode >= 300 {
					b, _ := io.ReadAll(resp.Body)
					log.Printf("Image download returned %d: %s", resp.StatusCode, string(b))
					return
				}
				// write file
				out, err := os.Create(dest)
				if err != nil {
					log.Printf("failed to create image file: %v", err)
					return
				}
				defer out.Close()
				if _, err := io.Copy(out, resp.Body); err != nil {
					log.Printf("failed to write image file: %v", err)
					return
				}
				// success
				err = nil
				// set lastErr nil by returning
				// we can't set outer variable here; instead use named return is complex, so exit via os.Stat check after
			}()
			// verify file exists
			if _, statErr := os.Stat(dest); statErr == nil {
				return nil
			}
		}

		// backoff and retry
		sleep := backoffBase * time.Duration(1<<attempt)
		if sleep > 60*time.Second {
			sleep = 60 * time.Second
		}
		jitter := time.Duration((attempt % 3)) * 250 * time.Millisecond
		log.Printf("Image download backing off %s (attempt %d/%d)...", sleep+jitter, attempt+1, maxRetries+1)
		time.Sleep(sleep + jitter)
	}

	return fmt.Errorf("failed to download image: %s", urlStr)
}

/* -------------------- Utility -------------------- */

func ensureDir(path string) error {
	return os.MkdirAll(path, 0o755)
}

/* -------------------- Main flow -------------------- */

func main() {
	log.Println("Loading .env (if present)...")
	_ = godotenv.Load()

	clientID := os.Getenv("SPOTIFY_CLIENT_ID")
	clientSecret := os.Getenv("SPOTIFY_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		log.Fatal("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set (env or .env)")
	}

	log.Println("Requesting Spotify access token...")
	token, err := getSpotifyToken(clientID, clientSecret)
	if err != nil {
		log.Fatalf("Failed to get token: %v", err)
	}
	log.Println("Token acquired.")

	// artist id to fetch - change as needed or read from args/env
	artistID := os.Getenv("SPOTIFY_ARTIST_ID")
	if artistID == "" {
		artistID = "63sat2XSMKdwKfqspmYQKP" // default: The Weeknd
	}

	profile := ArtistProfile{}

	log.Printf("Fetching artist details for id=%s...", artistID)
	if err := spotifyGetWithBackoff(fmt.Sprintf("artists/%s", artistID), map[string]string{}, token, &profile.Artist); err != nil {
		log.Fatalf("Failed fetching artist: %v", err)
	}
	log.Printf("Artist: %s (followers: %d)", profile.Artist.Name, profile.Artist.Followers.Total)

	// top tracks
	log.Println("Fetching top tracks...")
	var topTracksWrapper struct {
		Tracks []struct {
			ID         string `json:"id"`
			Name       string `json:"name"`
			PreviewURL string `json:"preview_url"`
			Album      struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"album"`
		} `json:"tracks"`
	}
	if err := spotifyGetWithBackoff(fmt.Sprintf("artists/%s/top-tracks", artistID), map[string]string{"market": "US"}, token, &topTracksWrapper); err != nil {
		log.Fatalf("Failed fetching top-tracks: %v", err)
	}
	for _, t := range topTracksWrapper.Tracks {
		profile.TopTracks = append(profile.TopTracks, Track{
			ID:         t.ID,
			Name:       t.Name,
			PreviewURL: t.PreviewURL,
			AlbumID:    t.Album.ID,
			AlbumName:  t.Album.Name,
		})
	}
	log.Printf("Fetched %d top tracks.", len(profile.TopTracks))

	// albums list
	allAlbums, err := fetchAllAlbums(artistID, token)
	if err != nil {
		log.Fatalf("Failed fetching album list: %v", err)
	}

	// prepare album ID list for batching
	albumIDs := make([]string, 0, len(allAlbums))
	albumByID := map[string]Album{}
	for _, a := range allAlbums {
		albumIDs = append(albumIDs, a.ID)
		albumByID[a.ID] = a // keep name/images from listing as fallback
	}

	// batch fetch album details (tracks, images)
	log.Printf("Batch fetching album details for %d albums (20 per request)...", len(albumIDs))
	batchMap, err := fetchAlbumsBatch(albumIDs, token)
	if err != nil {
		log.Printf("Warning: batch fetch returned error: %v (we'll use partial results if any)", err)
	}

	// merge results back into profile.Albums slice (preserve order from allAlbums slice)
	profile.Albums = make([]Album, 0, len(allAlbums))
	for _, a := range allAlbums {
		if detailed, ok := batchMap[a.ID]; ok {
			// use detailed version (has tracks and images)
			profile.Albums = append(profile.Albums, detailed)
		} else {
			// fallback: use listing info without tracks
			profile.Albums = append(profile.Albums, a)
		}
	}

	// prepare folder to save files
	artistSlug := sanitizeFileName(profile.Artist.Name)
	if artistSlug == "" {
		artistSlug = "artist"
	}
	outDir := filepath.Join(".", artistSlug)
	if err := ensureDir(outDir); err != nil {
		log.Fatalf("Failed to create output dir %s: %v", outDir, err)
	}
	log.Printf("Saving files to folder: %s", outDir)

	// Download album art images (largest available) and save filenames into album.ImageFile
	for idx := range profile.Albums {
		album := &profile.Albums[idx]
		if len(album.Images) == 0 {
			log.Printf("Album %s has no images, skipping download", album.Name)
			continue
		}
		// choose largest (first) image (Spotify returns largest first)
		imageURL := album.Images[0].URL
		ext := ".jpg"
		if strings.Contains(strings.ToLower(imageURL), ".png") {
			ext = ".png"
		}
		safeAlbumName := sanitizeFileName(album.Name)
		if safeAlbumName == "" {
			safeAlbumName = album.ID
		}
		fileName := fmt.Sprintf("%s_%s%s", album.ID, safeAlbumName, ext)
		fullPath := filepath.Join(outDir, fileName)

		log.Printf("Downloading image for album '%s' -> %s", album.Name, fileName)
		if err := downloadFileWithRetry(imageURL, fullPath, token); err != nil {
			log.Printf("Failed to download image for album %s: %v", album.Name, err)
			continue
		}
		album.ImageFile = fileName
		// small pause
		time.Sleep(150 * time.Millisecond)
	}

	// Build AllTracks array: top tracks + all album tracks (including singles & compilations)
	allTracks := []Track{}
	// include top tracks first (dedupe later if needed)
	allTracks = append(allTracks, profile.TopTracks...)

	for _, a := range profile.Albums {
		allTracks = append(allTracks, a.Tracks...)
	}

	// Optional dedupe tracks by id while preserving order
	seen := map[string]bool{}
	merged := make([]Track, 0, len(allTracks))
	for _, t := range allTracks {
		if t.ID == "" {
			// keep unnamed tracks (rare), but don't dedupe
			merged = append(merged, t)
			continue
		}
		if seen[t.ID] {
			continue
		}
		seen[t.ID] = true
		merged = append(merged, t)
	}
	profile.AllTracks = merged
	log.Printf("Total tracks after merging & dedupe: %d", len(profile.AllTracks))

	// Save profile JSON inside artist folder using artist slug
	jsonPath := filepath.Join(outDir, artistSlug+".json")
	f, err := os.Create(jsonPath)
	if err != nil {
		log.Fatalf("Failed creating json file: %v", err)
	}
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(profile); err != nil {
		f.Close()
		log.Fatalf("Failed writing json: %v", err)
	}
	f.Close()

	log.Printf("Saved artist profile JSON to: %s", jsonPath)
	log.Println("Done.")
}
