package svc

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"github.com/disintegration/imaging"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"image"
	"image/color"
	"image/draw"
	"io"
	"net/http"
	"time"
)

// TheAvatarService is a global AvatarService implementation
var TheAvatarService AvatarService = &avatarService{}

// AvatarService is a service interface for dealing with avatars
type AvatarService interface {
	// DownloadAndUpdateByUserID downloads an avatar from the specified URL and updates the given user. isCustom
	// indicates whether the avatar is customised by the user
	DownloadAndUpdateByUserID(userID *uuid.UUID, avatarURL string, isCustom bool) error
	// DownloadAndUpdateFromGravatar tries to download an avatar from Gravatar and, if successful, updates the user.
	// isCustom indicates whether the avatar update was explicitly initiated by the user
	DownloadAndUpdateFromGravatar(user *data.User, isCustom bool) error
	// GetByUserID finds and returns an avatar for the given user. Returns (nil, nil) if no avatar exists
	GetByUserID(userID *uuid.UUID) (*data.UserAvatar, error)
	// UpdateByUserID updates the given user's avatar in the database. r can be nil to remove the avatar, or otherwise
	// point to PNG or JPG data reader. isCustom indicates whether the avatar is customised by the user; ignored if r is
	// nil
	UpdateByUserID(userID *uuid.UUID, r io.Reader, isCustom bool) error
}

// avatarService is a blueprint AvatarService implementation
type avatarService struct{}

//----------------------------------------------------------------------------------------------------------------------

func (svc *avatarService) DownloadAndUpdateByUserID(userID *uuid.UUID, avatarURL string, isCustom bool) error {
	logger.Debugf("avatarService.DownloadAndUpdateByUserID(%s, '%s', %v)", userID, avatarURL, isCustom)

	// Download the image
	resp, err := http.Get(avatarURL)
	if err != nil {
		logger.Warningf("avatarService.DownloadAndUpdateByUserID: HTTP GET failed: %v", err)
		return ErrResourceFetch
	}
	defer util.LogError(resp.Body.Close, "avatarService.DownloadAndUpdateByUserID, resp.Body.Close()")

	// Make sure the HTTP status was successful
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		logger.Warningf("avatarService.DownloadAndUpdateByUserID: HTTP status %d: %s", resp.StatusCode, resp.Status)
		return ErrResourceFetch
	}

	// Limit the size of the response to 1 MiB to prevent DoS attacks that exhaust memory
	lr := &io.LimitedReader{R: resp.Body, N: 1024 * 1024}

	// Update the avatar
	return svc.UpdateByUserID(userID, lr, isCustom)
}

func (svc *avatarService) DownloadAndUpdateFromGravatar(user *data.User, isCustom bool) error {
	logger.Debugf("avatarService.DownloadAndUpdateFromGravatar(%v, %v)", user, isCustom)
	return svc.DownloadAndUpdateByUserID(
		&user.ID,
		fmt.Sprintf(
			"https://gravatar.com/avatar/%x?s=%d&d=404",
			sha256.Sum256([]byte(user.Email)),
			data.UserAvatarSizes[data.UserAvatarSizeL]),
		isCustom)
}

func (svc *avatarService) GetByUserID(userID *uuid.UUID) (*data.UserAvatar, error) {
	logger.Debugf("avatarService.GetByUserID(%s)", userID)

	// Anonymous has no avatar
	if *userID == data.AnonymousUser.ID {
		return nil, nil
	}

	// Query the database
	q := db.Dialect().
		Select("ts_updated", "is_custom", "avatar_s", "avatar_m", "avatar_l").
		From("cm_user_avatars").
		Where(goqu.Ex{"user_id": userID})

	ua := &data.UserAvatar{UserID: *userID}
	if err := db.SelectRow(q).Scan(&ua.UpdatedTime, &ua.IsCustom, &ua.AvatarS, &ua.AvatarM, &ua.AvatarL); errors.Is(err, sql.ErrNoRows) {
		// No avatar exists
		return nil, nil

	} else if err != nil {
		// Any other DB error
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return ua, nil
}

func (svc *avatarService) UpdateByUserID(userID *uuid.UUID, r io.Reader, isCustom bool) error {
	logger.Debugf("avatarService.UpdateByUserID(%s, %v, %v)", userID, r, isCustom)

	// Try to find the existing avatar
	ua, err := svc.GetByUserID(userID)
	if err != nil {
		return err
	}

	// Do not let a non-custom avatar overwrite a custom one
	if !isCustom && ua != nil && ua.IsCustom {
		return nil
	}

	// If no avatar data provided
	if r == nil {
		// If a database record exists, delete it
		if ua != nil {
			if err = db.ExecuteOne(db.Dialect().Delete("cm_user_avatars").Where(goqu.Ex{"user_id": userID})); err != nil {
				return err
			}
		}

		// Avatar data is provided. If there's an existing avatar
	} else if ua != nil {
		// Update the images
		if err = svc.readImage(r, ua); err != nil {
			return err
		}

		// Update the database record
		if err = db.ExecuteOne(
			db.Dialect().
				Update("cm_user_avatars").
				Set(goqu.Record{
					"ts_updated": time.Now().UTC(),
					"is_custom":  isCustom,
					"avatar_s":   ua.AvatarS,
					"avatar_m":   ua.AvatarM,
					"avatar_l":   ua.AvatarL,
				}).
				Where(goqu.Ex{"user_id": userID}),
		); err != nil {
			return err
		}

	} else {
		// No existing avatar record. Create a new avatar image set
		ua = &data.UserAvatar{UserID: *userID, UpdatedTime: time.Now().UTC(), IsCustom: isCustom}

		// Update the images
		if err = svc.readImage(r, ua); err != nil {
			return err
		}

		// Insert a new avatar database record
		if err = db.ExecuteOne(
			db.Dialect().
				Insert("cm_user_avatars").
				Rows(goqu.Record{
					"user_id":    &ua.UserID,
					"ts_updated": ua.UpdatedTime,
					"is_custom":  ua.IsCustom,
					"avatar_s":   ua.AvatarS,
					"avatar_m":   ua.AvatarM,
					"avatar_l":   ua.AvatarL,
				}),
		); err != nil {
			return err
		}
	}

	// Succeeded
	return nil
}

// decode turns data read from a buffer into an image
func (svc *avatarService) decode(r io.Reader) (image.Image, error) {
	logger.Debugf("avatarService.decode(%v)", r)

	// Decode the image
	img, imgFormat, err := image.Decode(r)
	if err != nil {
		return nil, err
	}
	logger.Debugf("Decoded avatar: format=%s, dimensions=%s", imgFormat, img.Bounds().Size())

	// If it's a PNG, flatten it against a white background
	if imgFormat == "png" {
		// Create a new white Image with the same dimension of PNG image
		bgImage := image.NewRGBA(img.Bounds())
		draw.Draw(bgImage, bgImage.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)

		// Paste the PNG image over the background
		draw.Draw(bgImage, bgImage.Bounds(), img, img.Bounds().Min, draw.Over)
		img = bgImage
	}

	// Succeeded
	return img, nil
}

// readImage reads the image data from the given reader and builds a set of images of the provided UserAvatar instance
func (svc *avatarService) readImage(r io.Reader, ua *data.UserAvatar) error {
	logger.Debugf("avatarService.readImage(%v, [%s])", r, &ua.UserID)

	// Decode the original image
	img, err := svc.decode(r)
	if err != nil {
		return err
	}

	// Make avatar images of all sizes and encode them into a JPEG
	for size, px := range data.UserAvatarSizes {
		var buf bytes.Buffer
		if err = imaging.Encode(&buf, imaging.Resize(img, px, 0, imaging.Lanczos), imaging.JPEG); err != nil {
			return err
		}
		ua.Set(size, buf.Bytes())
	}

	// Succeeded
	return nil
}
