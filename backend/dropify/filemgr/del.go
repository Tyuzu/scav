package filemgr

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// DeleteFile deletes a file.
// Thumbnail deletion should be handled separately when the
// caller knows the entity type and thumbnail location.
func DeleteFile(filePath string) error {

	if filePath == "" {
		return nil
	}

	if err := os.Remove(filePath); err != nil &&
		!os.IsNotExist(err) {

		return fmt.Errorf(
			"delete %s: %w",
			filePath,
			err,
		)
	}

	return nil
}

func DeleteFileWithThumb(
	entity EntityType,
	pictureType PictureType,
	filename string,
) error {

	filePath := filepath.Join(
		ResolvePath(entity, pictureType),
		filename,
	)

	if err := DeleteFile(filePath); err != nil {
		return err
	}

	base := strings.TrimSuffix(
		filename,
		filepath.Ext(filename),
	)

	thumbPath := filepath.Join(
		ResolvePath(entity, PicThumb),
		base+".jpg",
	)

	if err := os.Remove(thumbPath); err != nil &&
		!os.IsNotExist(err) {

		return fmt.Errorf(
			"delete thumbnail %s: %w",
			thumbPath,
			err,
		)
	}

	return nil
}
