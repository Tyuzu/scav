package filedrop

import (
	"context"
	"dropify/config"
	"dropify/filemgr"
	"dropify/infra/db"
	"dropify/middleware"
	"dropify/rdx"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// EditProfilePic is a stub handler for editing profile pictures
func EditProfilePic(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	http.Error(w, "Profile picture editing is not implemented in filedrop service", http.StatusNotImplemented)
}

func updateAvatars(_ http.ResponseWriter, r *http.Request, claims *middleware.Claims) (bson.M, error) {
	update := bson.M{}
	_ = claims
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		return nil, fmt.Errorf("error parsing form data: %w", err)
	}

	file, header, err := r.FormFile("avatar_picture")
	if err != nil {
		return nil, fmt.Errorf("avatar upload failed: %w", err)
	}
	defer file.Close()

	origName, thumbName, err := filemgr.SaveImageWithThumb(file, header, filemgr.EntityUser, filemgr.PicPhoto, 100, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("save image with thumb failed: %w", err)
	}

	update["avatar"] = origName
	update["profile_thumb"] = thumbName

	return update, nil
}

// ApplyProfileUpdates merges multiple bson.M maps into a single update map.
// (Not currently used if you’re only calling UpdateUserByUsername directly.)
func ApplyProfileUpdates(ctx context.Context, database db.Database, userid string, updates ...bson.M) error {
	finalUpdate := bson.M{}
	for _, u := range updates {
		for k, v := range u {
			finalUpdate[k] = v
		}
	}

	return database.UpdateOne(
		ctx,
		config.Collections.UserCollection,
		bson.M{"userid": userid},
		bson.M{"$set": finalUpdate},
	)
}

func InvalidateCachedProfile(ctx context.Context, username string) error {
	_, err := rdx.RdxDel(ctx, "profile:"+username)
	return err
}
