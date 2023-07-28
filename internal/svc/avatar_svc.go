package svc

import (
	"bytes"
	"database/sql"
	"github.com/disintegration/imaging"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
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
	// Decode turns data read from a buffer into an image
	Decode(r io.Reader) (image.Image, error)
	// DownloadAndUpdateByUserID downloads an avatar from the specified URL and updates the given user
	DownloadAndUpdateByUserID(userID *uuid.UUID, avatarURL string) error
	// GetByUserID finds and returns an avatar for the given user
	GetByUserID(userID *uuid.UUID) (*data.UserAvatar, error)
	// UpdateAvatar updates the images of the provided UserAvatar instance
	UpdateAvatar(r io.Reader, ua *data.UserAvatar) error
	// UpdateByUserID updates the given user's avatar in the database. r can be nil to remove the avatar, or otherwise
	// point to PNG or JPG data reader
	UpdateByUserID(userID *uuid.UUID, r io.Reader) error
}

// avatarService is a blueprint AvatarService implementation
type avatarService struct{}

//----------------------------------------------------------------------------------------------------------------------

func (svc *avatarService) Decode(r io.Reader) (image.Image, error) {
	logger.Debugf("avatarService.Decode(%v)", r)

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

func (svc *avatarService) DownloadAndUpdateByUserID(userID *uuid.UUID, avatarURL string) error {
	logger.Debugf("avatarService.DownloadAndUpdateByUserID(%s, '%s')", userID, avatarURL)

	// Download the image
	resp, err := http.Get(avatarURL)
	if err != nil {
		return err
	}
	//goland:noinspection GoUnhandledErrorResult
	defer resp.Body.Close()

	// Limit the size of the response to 1 MiB to prevent DoS attacks that exhaust memory
	lr := &io.LimitedReader{R: resp.Body, N: 1024 * 1024}

	// Update the avatar
	return svc.UpdateByUserID(userID, lr)
}

func (svc *avatarService) GetByUserID(userID *uuid.UUID) (*data.UserAvatar, error) {
	logger.Debugf("avatarService.GetByUserID(%s)", userID)

	// Query the database
	q := db.Dialect().
		Select("ts_updated", "avatar_s", "avatar_m", "avatar_l").
		From("cm_user_avatars").
		Where(goqu.Ex{"user_id": userID})

	ua := &data.UserAvatar{UserID: *userID}
	if err := db.SelectRow(q).Scan(&ua.UpdatedTime, &ua.AvatarS, &ua.AvatarM, &ua.AvatarL); err == sql.ErrNoRows {
		// No avatar exists
		return nil, nil

	} else if err != nil {
		// Any other DB error
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return ua, nil
}

func (svc *avatarService) UpdateAvatar(r io.Reader, ua *data.UserAvatar) error {
	logger.Debugf("avatarService.UpdateAvatar(%v, [%s])", r, &ua.UserID)

	// Decode the original image
	img, err := svc.Decode(r)
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

func (svc *avatarService) UpdateByUserID(userID *uuid.UUID, r io.Reader) error {
	logger.Debugf("avatarService.UpdateByUserID(%s, %v)", userID, r)

	// Try to find the existing avatar
	ua, err := svc.GetByUserID(userID)
	if err != nil {
		return err
	}

	// If no avatar data provided
	if r == nil {
		// If a database record exists, delete it
		if ua != nil {
			if err = db.ExecOne("delete from cm_user_avatars where user_id=$1;", userID); err != nil {
				return err
			}
		}

		// Avatar data is provided. If there's an existing avatar
	} else if ua != nil {
		// Update the images
		if err = svc.UpdateAvatar(r, ua); err != nil {
			return err
		}

		// Update the database record
		if err = db.ExecOne(
			"update cm_user_avatars set ts_updated=$1, avatar_s=$2, avatar_m=$3, avatar_l=$4 where user_id=$5;",
			time.Now().UTC(), ua.AvatarS, ua.AvatarM, ua.AvatarL, userID,
		); err != nil {
			return err
		}

	} else {
		// No existing avatar record. Create a new avatar image set
		ua = &data.UserAvatar{UserID: *userID, UpdatedTime: time.Now().UTC()}

		// Update the images
		if err = svc.UpdateAvatar(r, ua); err != nil {
			return err
		}

		// Insert a new avatar database record
		if err = db.ExecOne(
			"insert into cm_user_avatars(user_id, ts_updated, avatar_s, avatar_m, avatar_l) values($1, $2, $3, $4, $5);",
			ua.UserID, ua.UpdatedTime, ua.AvatarS, ua.AvatarM, ua.AvatarL,
		); err != nil {
			return err
		}
	}

	// Succeeded
	return nil
}
