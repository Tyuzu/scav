package filemgr

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"

	"github.com/google/uuid"
)

const (
	virusScanReadLimit = 1 << 20 // 1 MiB
	maxAllowedSizeScan = 1 << 30 // 1 GiB
)

// ScanForViruses performs a lightweight heuristic scan.
// This is NOT a replacement for ClamAV or a commercial AV engine.
func ScanForViruses(filePath string) error {

	if strings.Contains(strings.ToLower(filePath), "virus") {
		return fmt.Errorf("virus signature matched in filename")
	}

	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("scan: open failed: %w", err)
	}
	defer f.Close()

	stat, err := f.Stat()
	if err == nil {
		if stat.Size() <= 0 || stat.Size() > maxAllowedSizeScan {
			return fmt.Errorf("scan: suspicious file size: %d", stat.Size())
		}
	}

	buf := make([]byte, virusScanReadLimit)

	n, err := io.ReadFull(f, buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return fmt.Errorf("scan: read failed: %w", err)
	}

	if n == 0 {
		return fmt.Errorf("scan: empty file")
	}

	prefix := bytes.ToLower(buf[:n])

	// -------------------------
	// Executable detection
	// -------------------------

	if n >= 2 {
		if buf[0] == 'M' && buf[1] == 'Z' {
			return fmt.Errorf("scan: executable header detected")
		}
	}

	// -------------------------
	// ZIP detection
	// Remove this block if your system
	// intentionally supports ZIP/DOCX/PPTX uploads.
	// -------------------------

	if n >= 4 {
		if buf[0] == 0x50 &&
			buf[1] == 0x4B &&
			buf[2] == 0x03 &&
			buf[3] == 0x04 {

			return fmt.Errorf("scan: zip archive detected")
		}
	}

	// -------------------------
	// HTML / JS detection
	// -------------------------

	if bytes.Contains(prefix, []byte("<script")) ||
		bytes.Contains(prefix, []byte("<html")) ||
		bytes.Contains(prefix, []byte("<!doctype html")) {

		return fmt.Errorf("scan: html/javascript content detected")
	}

	// -------------------------
	// Suspicious JS
	// -------------------------

	if bytes.Contains(prefix, []byte("eval(")) &&
		bytes.Contains(prefix, []byte("document")) {

		return fmt.Errorf("scan: suspicious javascript-like content")
	}

	return nil
}

// StripEXIF re-encodes image as JPEG.
// image.Decode() already strips EXIF metadata.
func StripEXIF(img image.Image) (*bytes.Buffer, error) {

	buf := new(bytes.Buffer)

	if err := jpeg.Encode(
		buf,
		img,
		&jpeg.Options{
			Quality: 90,
		},
	); err != nil {

		return nil, fmt.Errorf(
			"strip exif: encode failed: %w",
			err,
		)
	}

	return buf, nil
}

// ExtractImageMetadata logs basic image metadata.
func ExtractImageMetadata(
	img image.Image,
	uid string,
) error {

	if img == nil {
		return fmt.Errorf("extract metadata: nil image")
	}

	bounds := img.Bounds()

	width := bounds.Dx()
	height := bounds.Dy()

	buf, err := StripEXIF(img)
	if err != nil {
		return fmt.Errorf(
			"extract metadata: encoding failed: %w",
			err,
		)
	}

	size := buf.Len()

	if LogFunc != nil {
		LogFunc(
			fmt.Sprintf(
				"metadata uid=%s width=%d height=%d size=%d",
				uid,
				width,
				height,
				size,
			),
			int64(size),
			"metadata",
		)
	} else {
		log.Printf(
			"metadata uid=%s width=%d height=%d size=%d",
			uid,
			width,
			height,
			size,
		)
	}

	return nil
}

// ensureSafeFilename sanitizes a filename.
func ensureSafeFilename(
	name string,
	ext string,
) (string, string) {

	name = strings.TrimSuffix(
		name,
		filepath.Ext(name),
	)

	name = strings.TrimSpace(name)
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "_")

	reg := regexp.MustCompile(`[^a-z0-9_\-]`)
	name = reg.ReplaceAllString(name, "")

	if name == "" {
		name = uuid.New().String()
	}

	if ext != "" {

		if !strings.HasPrefix(ext, ".") {
			ext = "." + strings.TrimPrefix(ext, ".")
		}

		ext = strings.ToLower(ext)
	}

	return name, ext
}

// getSafeFilename generates a safe filename.
func getSafeFilename(
	original string,
	ext string,
	fn func(string) string,
) (string, string) {

	name := ""

	if fn != nil {
		name = strings.TrimSpace(
			fn(original),
		)
	}

	if name == "" {
		return uuid.New().String(), ext
	}

	return ensureSafeFilename(
		name,
		ext,
	)
}

// isExtensionAllowed checks if extension is allowed.
func isExtensionAllowed(
	ext string,
	picType PictureType,
) bool {

	ext = strings.ToLower(ext)

	if ext == "" {
		return false
	}

	allowed := AllowedExtensions[picType]

	return slices.Contains(
		allowed,
		ext,
	)
}

// isMIMEAllowed checks if MIME is allowed.
func isMIMEAllowed(
	mimeType string,
	picType PictureType,
) bool {

	mimeType = strings.ToLower(mimeType)

	allowed := AllowedMIMEs[picType]

	for _, a := range allowed {
		if mimeType == a {
			return true
		}
	}

	return false
}

// extMatchesMIME ensures extension and MIME match allowed types.
func extMatchesMIME(
	ext,
	mimeType string,
	picType PictureType,
) bool {

	return isExtensionAllowed(ext, picType) &&
		isMIMEAllowed(mimeType, picType)
}

// ResolvePath returns upload path.
func ResolvePath(
	entity EntityType,
	picType PictureType,
) string {

	subfolder := PictureSubfolders[picType]

	if subfolder == "" {
		subfolder = "misc"
	}

	return filepath.Join(
		"static",
		"uploads",
		strings.ToLower(string(entity)),
		strings.ToLower(subfolder),
	)
}

// isImageType returns true for image picture types.
func isImageType(
	picType PictureType,
) bool {

	switch picType {

	case PicBanner,
		PicPhoto,
		PicMember,
		PicPoster,
		PicSeating,
		PicThumb:

		return true

	default:
		return false
	}
}

// ValidateImageDimensions checks image size limits.
func ValidateImageDimensions(
	img image.Image,
	maxWidth,
	maxHeight int,
) error {

	if img == nil {
		return fmt.Errorf(
			"validate dimensions: nil image",
		)
	}

	bounds := img.Bounds()

	if bounds.Dx() > maxWidth ||
		bounds.Dy() > maxHeight {

		return fmt.Errorf(
			"image dimensions %dx%d exceed max %dx%d",
			bounds.Dx(),
			bounds.Dy(),
			maxWidth,
			maxHeight,
		)
	}

	return nil
}
