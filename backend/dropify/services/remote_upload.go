package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"naevis/dropify/filemgr"
	"net"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ----------------------------------------------------
// SSRF Protection
// ----------------------------------------------------

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}

	if ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsMulticast() ||
		ip.IsUnspecified() {
		return true
	}

	// IPv6 localhost
	if ip.String() == "::1" {
		return true
	}

	return false
}

func validateRemoteHost(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid remote URL")
	}

	host := parsed.Hostname()
	if host == "" {
		return fmt.Errorf("invalid host")
	}

	switch strings.ToLower(host) {
	case "localhost", "localhost.localdomain":
		return fmt.Errorf("localhost addresses are not allowed")
	}

	// Direct IP address
	if ip := net.ParseIP(host); ip != nil {
		if isPrivateIP(ip) {
			return fmt.Errorf("private network addresses are not allowed")
		}
		return nil
	}

	// DNS resolution
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("unable to resolve host")
	}

	if len(ips) == 0 {
		return fmt.Errorf("host has no valid addresses")
	}

	for _, ip := range ips {
		if isPrivateIP(ip) {
			return fmt.Errorf("host resolves to a private address")
		}
	}

	return nil
}

// ----------------------------------------------------
// Remote Upload Processing
// ----------------------------------------------------

// ProcessRemoteFile downloads and stores a remote image
func (s *FileService) ProcessRemoteFile(
	remoteURL string,
	key string,
	entityType string,
	entityId string,
) ([]Attachment, error) {

	_ = entityId // reserved for future use

	// -------------------------
	// Validate URL
	// -------------------------

	parsed, err := url.Parse(remoteURL)
	if err != nil {
		return nil, fmt.Errorf("invalid remote URL")
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported URL scheme")
	}

	// -------------------------
	// SSRF Protection
	// -------------------------

	if err := validateRemoteHost(remoteURL); err != nil {
		return nil, err
	}

	// -------------------------
	// Download file
	// -------------------------

	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {

			if len(via) > 10 {
				return fmt.Errorf("too many redirects")
			}

			if err := validateRemoteHost(req.URL.String()); err != nil {
				return err
			}

			return nil
		},
	}

	resp, err := client.Get(remoteURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download remote file")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("remote server returned %d", resp.StatusCode)
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))

	if !strings.HasPrefix(contentType, "image/") {
		return nil, fmt.Errorf("remote file is not an image")
	}

	// -------------------------
	// Temp file
	// -------------------------

	tmpFile, err := os.CreateTemp("", "remote-upload-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file")
	}
	defer os.Remove(tmpFile.Name())

	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		tmpFile.Close()
		return nil, fmt.Errorf("failed to save remote file")
	}

	if err := tmpFile.Close(); err != nil {
		return nil, err
	}

	// -------------------------
	// Reopen temp file
	// -------------------------

	file, err := os.Open(tmpFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to reopen temp file")
	}
	defer file.Close()

	// -------------------------
	// Resolve entity
	// -------------------------

	entity := filemgr.EntityType(strings.ToLower(entityType))

	// -------------------------
	// Resolve picture type
	// -------------------------

	picType, ok := map[string]filemgr.PictureType{
		"banner":  filemgr.PicBanner,
		"photo":   filemgr.PicPhoto,
		"avatar":  filemgr.PicPhoto,
		"seating": filemgr.PicSeating,
	}[strings.ToLower(key)]

	if !ok {
		return nil, fmt.Errorf("invalid picture key")
	}

	// -------------------------
	// Create multipart header
	// -------------------------

	filename := filepath.Base(parsed.Path)

	if filename == "." || filename == "/" || filename == "" {
		filename = "remote.jpg"
	}

	header := &multipart.FileHeader{
		Filename: filename,
		Header: textproto.MIMEHeader{
			"Content-Type": []string{contentType},
		},
		Size: resp.ContentLength,
	}

	// -------------------------
	// Save through existing pipeline
	// -------------------------

	savedName, ext, err := filemgr.SaveFileForEntity(
		file,
		header,
		entity,
		picType,
	)
	if err != nil {
		return nil, err
	}

	return []Attachment{
		{
			Filename:  savedName,
			Extension: ext,
			Key:       strings.ToLower(key),
		},
	}, nil
}
