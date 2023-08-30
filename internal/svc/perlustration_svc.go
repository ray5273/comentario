package svc

import (
	"fmt"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// ThePerlustrationService is a global PerlustrationService implementation
var ThePerlustrationService PerlustrationService = &perlustrationService{}

// CommentScanner can scan a comment for inappropriate content
type CommentScanner interface {
	// Scan scans the provided comment for inappropriate content and returns whether it was found
	Scan(req *http.Request, comment *data.Comment, domain *data.Domain, page *data.DomainPage, user *data.User, domainUser *data.DomainUser, isEdit bool) (bool, error)
}

// PerlustrationService is an extension of CommentScanner that maintains an internal list of CommentScanner's and allows
// to scan comments against all of them
type PerlustrationService interface {
	CommentScanner
	// Init the service
	Init()
}

//----------------------------------------------------------------------------------------------------------------------

// perlustrationService is a blueprint PerlustrationService implementation
type perlustrationService struct {
	css []CommentScanner
}

func (svc *perlustrationService) Init() {
	// Akismet
	if config.SecretsConfig.Akismet.Key != "" {
		k := config.SecretsConfig.Akismet.Key
		logger.Infof("Registering Akismet scanner with API key %s", strings.Repeat("*", len(k)))
		svc.css = append(svc.css, &akismetScanner{api_key: k})
	}
}

func (svc *perlustrationService) Scan(req *http.Request, comment *data.Comment, domain *data.Domain, page *data.DomainPage, user *data.User, domainUser *data.DomainUser, isEdit bool) (bool, error) {
	// Iterate known comment scanners
	var lastErr error
	for _, cs := range svc.css {
		// Scan and skip over a failed scanner
		if b, err := cs.Scan(req, comment, domain, page, user, domainUser, isEdit); err != nil {
			lastErr = err
		} else if b {
			// Exit on a first positive
			return true, nil
		}
	}

	// Return a (tentative) negative and any occurred error
	return false, lastErr
}

//----------------------------------------------------------------------------------------------------------------------

// akismetScanner is a CommentScanner that uses Akismet for comment content checking
type akismetScanner struct {
	api_key string
}

func (s *akismetScanner) Scan(req *http.Request, comment *data.Comment, domain *data.Domain, page *data.DomainPage, user *data.User, _ *data.DomainUser, isEdit bool) (bool, error) {
	d := url.Values{
		"api_key":              {s.api_key},
		"blog":                 {domain.RootURL()},
		"user_ip":              {util.UserIP(req)},
		"user_agent":           {util.UserAgent(req)},
		"referrer":             {req.Header.Get("Referer")},
		"permalink":            {domain.RootURL() + page.Path},
		"comment_type":         {"comment"},
		"comment_author":       {user.Name},
		"comment_author_email": {user.Email},
		"comment_author_url":   {user.WebsiteURL},
		"comment_content":      {comment.Markdown},
		"comment_date_gmt":     {comment.CreatedTime.UTC().Format(time.RFC3339)},
		"blog_charset":         {"UTF-8"},
	}
	if isEdit {
		d.Set("recheck_reason", "edit")
	}

	// Submit the form to Akismet
	client := &http.Client{}
	dataStr := d.Encode()
	logger.Debugf("Submitting comment to Akismet: %s", dataStr)
	req, err := http.NewRequest("POST", "https://rest.akismet.com/1.1/comment-check", strings.NewReader(dataStr))
	if err != nil {
		return false, err
	}
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Add("Content-Length", strconv.Itoa(len(dataStr)))
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	//goland:noinspection GoUnhandledErrorResult
	defer resp.Body.Close()

	// Fetch the response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}
	logger.Debugf("Akismet response: %s", respBody)

	// Check the content
	switch string(respBody) {
	case "true":
		return true, nil
	case "false":
		return false, nil
	}
	return false, fmt.Errorf("failed to call Akismet API: %s", respBody)
}
