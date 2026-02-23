package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"naevis/globals"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

const (
	RefreshTokenTTL = 7 * 24 * time.Hour
	AccessTokenTTL  = 15 * time.Minute

	maxFailedAttempts = 5
	lockoutDuration   = 10 * time.Minute
)

var (
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)
	emailRegex    = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
)

/* ============================================================
   Helpers
============================================================ */

func isProd() bool {
	return strings.ToLower(os.Getenv("ENV")) == "production"
}

func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	if rip := r.Header.Get("X-Real-IP"); rip != "" {
		return rip
	}
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	return host
}

func ipPrefix(ip string) string {
	if strings.Contains(ip, ":") {
		return ip
	}
	parts := strings.Split(ip, ".")
	if len(parts) < 2 {
		return ip
	}
	return parts[0] + "." + parts[1]
}

func uaHash(r *http.Request) string {
	sum := sha256.Sum256([]byte(r.UserAgent()))
	return hex.EncodeToString(sum[:])
}

func hashRefreshToken(token string) string {
	mac := hmac.New(sha256.New, globals.RefreshTokenSecret)
	mac.Write([]byte(token))
	return hex.EncodeToString(mac.Sum(nil))
}

func generateRefreshToken() (string, error) {
	b := make([]byte, 64)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func createAccessToken(claims *models.Claims) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(globals.JwtSecret)
}

func setRefreshCookie(w http.ResponseWriter, token string) {
	sameSite, secure := refreshCookieAttrs()

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		Expires:  time.Now().Add(RefreshTokenTTL),
		MaxAge:   int(RefreshTokenTTL.Seconds()),
	})
}

func clearRefreshCookie(w http.ResponseWriter) {
	sameSite, secure := refreshCookieAttrs()

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

func refreshCookieAttrs() (http.SameSite, bool) {
	if isProd() {
		return http.SameSiteNoneMode, true
	}
	return http.SameSiteLaxMode, false
}

/* ============================================================
   Validators
============================================================ */

func validateUsername(u string) bool { return usernameRegex.MatchString(u) }
func validateEmail(e string) bool    { return emailRegex.MatchString(e) }
func validatePassword(p string) bool { return len(p) >= 6 }

/* ============================================================
   REGISTER
============================================================ */

func Register(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Email    string `json:"email"`
		}

		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		input.Username = strings.TrimSpace(input.Username)
		input.Password = strings.TrimSpace(input.Password)
		input.Email = strings.ToLower(strings.TrimSpace(input.Email))

		if !validateUsername(input.Username) ||
			!validateEmail(input.Email) ||
			!validatePassword(input.Password) {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid credentials")
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword(
			[]byte(input.Password),
			bcrypt.DefaultCost,
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Password error")
			return
		}

		now := time.Now()

		user := models.User{
			UserID:        "u" + utils.GenerateRandomString(10),
			Username:      input.Username,
			Email:         input.Email,
			Password:      string(hashedPassword),
			Role:          []string{"user"},
			CreatedAt:     now,
			UpdatedAt:     now,
			EmailVerified: false,
			IsVerified:    false,
			Online:        false,
		}

		if err := app.DB.Insert(ctx, UsersCollection, user); err != nil {
			if mongo.IsDuplicateKeyError(err) {
				utils.RespondWithError(w, http.StatusConflict, "User already exists")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, "Registration failed")
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"message": "User registered successfully",
			"userid":  user.UserID,
		})
	}
}

/* ============================================================
   LOGIN
============================================================ */

func Login(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var creds struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}

		if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		creds.Username = strings.TrimSpace(creds.Username)
		creds.Password = strings.TrimSpace(creds.Password)

		ip := clientIP(r)
		failKey := fmt.Sprintf("auth:fail:%s:%s", creds.Username, ipPrefix(ip))

		val, err := app.Cache.Get(ctx, failKey)
		var cnt int64
		if err == nil && len(val) > 0 {
			cnt, _ = strconv.ParseInt(string(val), 10, 64)
		}

		if cnt >= maxFailedAttempts {
			utils.RespondWithError(w, http.StatusTooManyRequests, "Too many attempts")
			return
		}

		var user models.User
		if err := app.DB.FindOne(
			ctx,
			UsersCollection,
			bson.M{"username": creds.Username},
			&user,
		); err != nil {

			cnt, _ = app.Cache.Incr(ctx, failKey)
			app.Cache.Set(
				ctx,
				failKey,
				[]byte(strconv.FormatInt(cnt, 10)),
				lockoutDuration,
			)

			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}

		if bcrypt.CompareHashAndPassword(
			[]byte(user.Password),
			[]byte(creds.Password),
		) != nil {

			cnt, _ = app.Cache.Incr(ctx, failKey)
			app.Cache.Set(
				ctx,
				failKey,
				[]byte(strconv.FormatInt(cnt, 10)),
				lockoutDuration,
			)

			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}

		// Clear fail counter on success
		app.Cache.Del(ctx, failKey)

		claims := &models.Claims{
			UserID:   user.UserID,
			Username: user.Username,
			Role:     user.Role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenTTL)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}

		accessToken, err := createAccessToken(claims)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Token error")
			return
		}

		refreshToken, err := generateRefreshToken()
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Token error")
			return
		}

		// Persist session state in DB first (authoritative)
		err = app.DB.Update(
			ctx,
			UsersCollection,
			bson.M{"userid": user.UserID},
			bson.M{
				"$set": bson.M{
					"refresh_token":  hashRefreshToken(refreshToken),
					"refresh_expiry": time.Now().Add(RefreshTokenTTL),
					"refresh_ua":     uaHash(r),
					"refresh_ip":     ipPrefix(ip),
					"last_login":     time.Now(),
					"online":         true,
					"updated_at":     time.Now(),
				},
			},
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Session error")
			return
		}

		// Set cookie after DB update (single place for cookie writes)
		setRefreshCookie(w, refreshToken)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Login successful",
			"data": map[string]string{
				"token":  accessToken,
				"userid": user.UserID,
			},
		})
	}
}

func LogoutUser(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		if r.Header.Get("X-Refresh-Intent") != "1" {
			utils.RespondWithError(w, http.StatusForbidden, "CSRF blocked")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		cookie, err := r.Cookie("refresh_token")
		if err == nil && cookie.Value != "" {
			hashed := hashRefreshToken(cookie.Value)
			app.DB.Update(ctx,
				UsersCollection,
				bson.M{"refresh_token": hashed},
				bson.M{"$unset": bson.M{"refresh_token": "", "refresh_expiry": ""}},
			)
		}

		clearRefreshCookie(w)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Logged out",
			"data":    nil,
		})
	}
}

func LogoutAllSessions(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		// 1. Extract and validate the JWT from the Authorization header (strip "Bearer " if present).
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		tokenString := authHeader
		// if strings.HasPrefix(authHeader, "Bearer ") {
		// 	tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		// }

		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		err = app.DB.Update(
			ctx,
			UsersCollection,
			bson.M{"userid": claims.UserID},
			bson.M{
				"$unset": bson.M{
					"refresh_token":  "",
					"refresh_prev":   "",
					"refresh_expiry": "",
					"refresh_ua":     "",
					"refresh_ip":     "",
				},
				"$set": bson.M{
					"online":     false,
					"updated_at": time.Now(),
				},
			},
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Logout failed")
			return
		}

		clearRefreshCookie(w)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "All sessions revoked",
		})
	}
}
