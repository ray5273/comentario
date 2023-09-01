package svc

import (
	"bytes"
	"encoding/json"
	"fmt"
	"gitlab.com/comentario/comentario/internal/api/models"
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
	// ID returns the domain extension ID that corresponds to this scanner
	ID() models.DomainExtensionID

	// Scan scans the provided comment for inappropriate content and returns whether it was found
	Scan(
		config map[string]string, req *http.Request, comment *data.Comment, domain *data.Domain, page *data.DomainPage,
		user *data.User, domainUser *data.DomainUser, isEdit bool) (bool, error)
}

// PerlustrationService is a collection of CommentScanners that allows to scan comments against those of them enabled
// for the given domain
type PerlustrationService interface {
	// Init the service
	Init()

	// Scan scans the provided comment for inappropriate content and returns whether it was found
	Scan(
		extensions []*data.DomainExtension, req *http.Request, comment *data.Comment, domain *data.Domain,
		page *data.DomainPage, user *data.User, domainUser *data.DomainUser, isEdit bool) (bool, error)
}

//----------------------------------------------------------------------------------------------------------------------

// perlustrationService is a blueprint PerlustrationService implementation
type perlustrationService struct {
	css []CommentScanner
}

func (svc *perlustrationService) Init() {
	// Akismet
	ak := config.SecretsConfig.Extensions.Akismet
	if ak.Usable() {
		logger.Info("Registering Akismet extension")
		svc.css = append(svc.css, &akismetScanner{apiKey: ak.Key})
	}

	// Perspective
	pk := config.SecretsConfig.Extensions.Perspective
	if pk.Usable() {
		logger.Info("Registering Perspective extension")
		svc.css = append(svc.css, &perspectiveScanner{apiKey: pk.Key})
	}

	// APILayer SpamChecker
	asck := config.SecretsConfig.Extensions.APILayerSpamChecker
	if ak.Usable() {
		logger.Info("Registering APILayer SpamChecker extension")
		svc.css = append(svc.css, &apiLayerSpamCheckerScanner{apiKey: asck.Key})
	}

	// Enable corresponding extensions in the config
	for _, scanner := range svc.css {
		data.DomainExtensions[scanner.ID()].Enabled = true
	}
}

func (svc *perlustrationService) Scan(
	extensions []*data.DomainExtension, req *http.Request, comment *data.Comment, domain *data.Domain,
	page *data.DomainPage, user *data.User, domainUser *data.DomainUser, isEdit bool,
) (bool, error) {
	// Iterate known comment scanners
	var lastErr error
	for _, cs := range svc.css {
		// Check if the scanner is enabled for the domain by searching for the corresponding extension
		var ex *data.DomainExtension
		for _, _ex := range extensions {
			if _ex.ID == cs.ID() {
				ex = _ex
				break
			}
		}

		// Scan and skip over a failed scanner
		if ex != nil {
			if b, err := cs.Scan(ex.ConfigParams(), req, comment, domain, page, user, domainUser, isEdit); err != nil {
				lastErr = err
			} else if b {
				// Exit on a first positive
				return true, nil
			}
		}
	}

	// Return a (tentative) negative and any occurred error
	return false, lastErr
}

//----------------------------------------------------------------------------------------------------------------------

// akismetScanner is a CommentScanner that uses Akismet for comment content checking
type akismetScanner struct {
	apiKey string
}

func (s *akismetScanner) ID() models.DomainExtensionID {
	return models.DomainExtensionIDAkismet
}

func (s *akismetScanner) Scan(
	_ map[string]string, req *http.Request, comment *data.Comment, domain *data.Domain, page *data.DomainPage,
	user *data.User, _ *data.DomainUser, isEdit bool,
) (bool, error) {
	d := url.Values{
		"api_key":              {s.apiKey},
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
	rq, err := http.NewRequest("POST", "https://rest.akismet.com/1.1/comment-check", strings.NewReader(dataStr))
	if err != nil {
		return false, err
	}
	rq.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	rq.Header.Add("Content-Length", strconv.Itoa(len(dataStr)))
	resp, err := client.Do(rq)
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

//----------------------------------------------------------------------------------------------------------------------

// perspectiveScanner is a CommentScanner that uses Perspective for comment content checking
type perspectiveScanner struct {
	apiKey string
}

type perspectiveResponse struct {
	AttributeScores struct {
		Toxicity struct {
			SummaryScore struct {
				Value float64 `json:"value"`
			} `json:"summaryScore"`
		} `json:"TOXICITY"`
	} `json:"attributeScores"`
}

func (s *perspectiveScanner) ID() models.DomainExtensionID {
	return models.DomainExtensionIDPerspective
}

func (s *perspectiveScanner) Scan(
	config map[string]string, _ *http.Request, comment *data.Comment, _ *data.Domain, _ *data.DomainPage, _ *data.User,
	_ *data.DomainUser, _ bool,
) (bool, error) {
	// Prepare a request
	d, err := json.Marshal(map[string]any{
		"comment":             map[string]any{"text": comment.Markdown},
		"requestedAttributes": map[string]any{"TOXICITY": struct{}{}},
	})
	if err != nil {
		return false, err
	}

	// Submit a request to Perspective
	client := &http.Client{}
	rq, err := http.NewRequest(
		"POST",
		fmt.Sprintf("https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=%s", s.apiKey),
		bytes.NewReader(d))
	if err != nil {
		return false, err
	}
	rq.Header.Set("apikey", s.apiKey)

	// Fetch the response
	res, err := client.Do(rq)
	if err != nil {
		return false, err
	}
	//goland:noinspection GoUnhandledErrorResult
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return false, err
	}
	logger.Debugf("Perspective response: %s", body)

	// Unmarshal the response
	var result perspectiveResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}

	// Try to extract the threshold from the config
	threshold, err := strconv.ParseFloat(config["threshold"], 32)
	if err != nil {
		threshold = 0.5
	}

	// Succeeded: check the score
	return result.AttributeScores.Toxicity.SummaryScore.Value > threshold, nil
}

//----------------------------------------------------------------------------------------------------------------------

// apiLayerSpamCheckerScanner is a CommentScanner that uses APILayer SpamChecker for comment content checking
type apiLayerSpamCheckerScanner struct {
	apiKey string
}

type apiLayerSpamCheckerResponse struct {
	IsSpam bool    `json:"is_spam"`
	Result string  `json:"result"`
	Score  float32 `json:"score"`
	Text   string  `json:"text"`
}

func (s *apiLayerSpamCheckerScanner) ID() models.DomainExtensionID {
	return models.DomainExtensionIDAPILayerDotSpamChecker
}

func (s *apiLayerSpamCheckerScanner) Scan(
	config map[string]string, _ *http.Request, comment *data.Comment, _ *data.Domain, _ *data.DomainPage,
	_ *data.User, _ *data.DomainUser, _ bool,
) (bool, error) {
	// Submit a request to the APILayer
	client := &http.Client{}
	rq, err := http.NewRequest(
		"POST",
		fmt.Sprintf("https://api.apilayer.com/spamchecker?threshold=%s", config["threshold"]),
		strings.NewReader(comment.Markdown))
	if err != nil {
		return false, err
	}
	rq.Header.Set("apikey", s.apiKey)

	// Fetch the response
	res, err := client.Do(rq)
	if err != nil {
		return false, err
	}
	//goland:noinspection GoUnhandledErrorResult
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return false, err
	}
	logger.Debugf("APILayer SpamChecker response: %s", body)

	// Unmarshal the response
	var result apiLayerSpamCheckerResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}

	// Succeeded
	return result.IsSpam, nil
}
