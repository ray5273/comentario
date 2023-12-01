package svc

import (
	"encoding/xml"
	"errors"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"time"
)

type rssXML struct {
	XMLName  xml.Name     `xml:"rss"`
	Channels []rssChannel `xml:"channel"`
}

type rssChannel struct {
	XMLName xml.Name        `xml:"channel"`
	Items   []wordpressItem `xml:"item"`
}

type wordpressItem struct {
	XMLName  xml.Name           `xml:"item"`
	ID       string             `xml:"http://wordpress.org/export/1.2/ post_id"`
	Title    string             `xml:"title"`
	Link     string             `xml:"link"`
	Comments []wordpressComment `xml:"http://wordpress.org/export/1.2/ comment"`
}

type wordpressComment struct {
	XMLName     xml.Name `xml:"http://wordpress.org/export/1.2/ comment"`
	ID          string   `xml:"http://wordpress.org/export/1.2/ comment_id"`
	Author      string   `xml:"http://wordpress.org/export/1.2/ comment_author"`
	AuthorEmail string   `xml:"http://wordpress.org/export/1.2/ comment_author_email"`
	AuthorURL   string   `xml:"http://wordpress.org/export/1.2/ comment_author_url"`
	AuthorIP    string   `xml:"http://wordpress.org/export/1.2/ comment_author_IP"`
	Date        string   `xml:"http://wordpress.org/export/1.2/ comment_date_gmt"`
	Content     string   `xml:"http://wordpress.org/export/1.2/ comment_content"`
	Approved    string   `xml:"http://wordpress.org/export/1.2/ comment_approved"`
	Type        string   `xml:"http://wordpress.org/export/1.2/ comment_type"`
	Parent      string   `xml:"http://wordpress.org/export/1.2/ comment_parent"`
}

func wordpressImport(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult {
	// Fetch and decompress the export tarball
	d, err := util.DecompressGzip(reader)
	if err != nil {
		logger.Errorf("wordpressImport: DecompressGzip() failed: %v", err)
		return importError(err)
	}

	// Unmarshal the XML data
	exp := rssXML{}
	err = xml.Unmarshal(d, &exp)
	if err != nil {
		logger.Errorf("wordpressImport: xml.Unmarshal() failed: %v", err)
		return importError(err)
	}

	result := &ImportResult{}

	// Make sure there's at least one channel
	if len(exp.Channels) == 0 {
		return result.WithError(errors.New("no channels found in the RSS feed"))
	}

	// Create/map commenters: email -> ID
	var userIDMap map[string]uuid.UUID
	if userIDMap, result.UsersAdded, result.DomainUsersAdded, err = wordpressMakeUserMap(&curUser.ID, &domain.ID, exp); err != nil {
		return result.WithError(err)
	}

	// Total number of users
	result.UsersTotal = len(userIDMap)

	// TODO map pages

	// TODO map and add comments

	return result
}

// wordpressMakeUserMap creates a map of email -> user ID from the given Wordpress export data
func wordpressMakeUserMap(curUserID, domainID *uuid.UUID, exp rssXML) (userMap map[string]uuid.UUID, usersAdded, domainUsersAdded int, err error) {
	userIDMap := make(map[string]uuid.UUID)
	for _, channel := range exp.Channels {
		for _, post := range channel.Items {
			for _, comment := range post.Comments {
				// Only keep comments and skip users without name or email
				if comment.Type != "comment" || comment.Author == "" || comment.AuthorEmail == "" {
					continue
				}

				// Skip already existing users
				if _, ok := userIDMap[comment.AuthorEmail]; ok {
					continue
				}

				// Try to find an existing user with the same email
				var user, u *data.User
				if u, err = TheUserService.FindUserByEmail(comment.AuthorEmail, false); err == nil {
					// User already exists
					user = u

					// Check if domain user exists, too
					if _, _, err = TheDomainService.FindDomainUserByID(domainID, &u.ID); err == nil {
						// Add the user mapping
						userIDMap[comment.AuthorEmail] = user.ID

						// Proceed to the next record
						continue

					} else if !errors.Is(err, ErrNotFound) {
						// Any other error than "not found"
						return
					}

				} else if !errors.Is(err, ErrNotFound) {
					// Any other error than "not found"
					return
				}

				// Persist a new user instance, if it doesn't exist
				commentTime := wordpressParseDate(comment.Date)
				if user == nil {
					user = data.NewUser(comment.AuthorEmail, comment.Author)
					user.CreatedTime = commentTime
					user.UserCreated = uuid.NullUUID{UUID: *curUserID, Valid: true}
					user.
						WithWebsiteURL(comment.AuthorURL).
						WithRemarks("Imported from WordPress")
					if err = TheUserService.Create(user); err != nil {
						return
					}
					usersAdded++
				}

				// Add the user's hex-to-ID mapping
				userIDMap[comment.AuthorEmail] = user.ID

				// Add a domain user as well
				du := &data.DomainUser{
					DomainID:        *domainID,
					UserID:          user.ID,
					IsCommenter:     true,
					NotifyReplies:   true,
					NotifyModerator: true,
					CreatedTime:     commentTime,
				}
				if err = TheDomainService.UserAdd(du); err != nil {
					return
				}
				domainUsersAdded++
			}
		}
	}

	// Succeeded
	return userIDMap, usersAdded, domainUsersAdded, nil
}

// wordpressParseDate parses a WordPress UTC/GMT date in the given string, returning the current time if parsing fails
func wordpressParseDate(s string) time.Time {
	// Try RFC3339 first
	t, err := time.ParseInLocation(time.RFC3339, s, time.UTC)
	if err != nil {
		// Next, a datetime
		if t, err = time.ParseInLocation(time.DateTime, s, time.UTC); err != nil {
			// Failed
			return time.Now().UTC()
		}
	}
	return t
}
