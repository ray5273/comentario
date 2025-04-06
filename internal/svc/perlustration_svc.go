package svc

import (
	"bytes"
	"encoding/json"
	"errors"
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

// commentScanningContext is a context for scanning a comment
type commentScanningContext struct {
	Request    *http.Request    // HTTP request sent by the commenter
	Comment    *data.Comment    // Comment being submitted
	Domain     *data.Domain     // Comment's domain
	Page       *data.DomainPage // Comment's domain page
	User       *data.User       // User who submitted the comment
	DomainUser *data.DomainUser // Domain user corresponding to User
	IsEdit     bool             // Whether the comment was edited, as opposed to a new comment
}

// CommentScanner can scan a comment for inappropriate content
type CommentScanner interface {
	// ID returns the domain extension ID that corresponds to this scanner
	ID() models.DomainExtensionID
	// KeyProvided returns whether an API key was globally provided for this domain extension
	KeyProvided() bool
	// Scan scans the provided comment for inappropriate content and returns whether it was found, and a reason for that
	Scan(config map[string]string, ctx *commentScanningContext) (bool, string, error)
}

// PerlustrationService is a collection of CommentScanners that allows to scan comments against those of them enabled
// for the given domain
type PerlustrationService interface {
	// Init the service
	Init()
	// NeedsModeration returns whether the given comment needs to be moderated, and if so, the reason for that
	NeedsModeration(
		req *http.Request, comment *data.Comment, domain *data.Domain, page *data.DomainPage, user *data.User,
		domainUser *data.DomainUser, isEdit bool) (bool, string, error)
}

//----------------------------------------------------------------------------------------------------------------------

// perlustrationService is a blueprint PerlustrationService implementation
type perlustrationService struct {
	scanners []CommentScanner
}

func (svc *perlustrationService) Init() {
	// Akismet
	ak := config.SecretsConfig.Extensions.Akismet
	if !ak.Disable {
		logger.Info("Registering Akismet extension")
		svc.scanners = append(svc.scanners, &akismetScanner{apiScanner{apiKey: ak.Key}})
	}

	// Perspective
	pk := config.SecretsConfig.Extensions.Perspective
	if !pk.Disable {
		logger.Info("Registering Perspective extension")
		svc.scanners = append(svc.scanners, &perspectiveScanner{apiScanner{apiKey: pk.Key}})
	}

	// APILayer SpamChecker
	asck := config.SecretsConfig.Extensions.APILayerSpamChecker
	if !asck.Disable {
		logger.Info("Registering APILayer SpamChecker extension")
		svc.scanners = append(svc.scanners, &apiLayerSpamCheckerScanner{apiScanner{apiKey: asck.Key}})
	}

	// Enable/update corresponding extensions in the config
	for _, scanner := range svc.scanners {
		x := data.DomainExtensions[scanner.ID()]
		x.Enabled = true
		x.KeyProvided = scanner.KeyProvided()
	}
}

func (svc *perlustrationService) NeedsModeration(
	req *http.Request, comment *data.Comment, domain *data.Domain, page *data.DomainPage, user *data.User,
	domainUser *data.DomainUser, isEdit bool) (bool, string, error) {

	// Comments by superusers, owners, and moderators are always pre-approved
	if user.IsSuperuser || domainUser.CanModerate() {
		return false, "", nil
	}

	// If it's a new comment, check domain moderation policy
	if !isEdit {
		switch user.IsAnonymous() {
		// Authenticated user
		case false:
			// If all authenticated are to be approved
			if domain.ModAuthenticated {
				return true, "Domain policy requires moderation on comments by authenticated users", nil
			}

			// If the user was created less than the required number of days ago
			if age := domainUser.AgeInDays(); age < domain.ModUserAgeDays {
				return true, fmt.Sprintf("User is created %d days ago (domain policy requires at least %d)", age, domain.ModUserAgeDays), nil
			}

			// If there's a number of comments specified for the domain
			if domain.ModNumComments > 0 {
				// Verify the user has the required number of approved comments
				if cnt, err := Services.CommentService(nil).Count(user, domainUser, &domain.ID, nil, &user.ID, true, false, false, false); err != nil {
					return false, "", err
				} else if cnt < int64(domain.ModNumComments) {
					return true, fmt.Sprintf("User has %d approved comments (domain policy requires at least %d)", cnt, domain.ModNumComments), nil
				}
			}

		// Anonymous user
		case true:
			if domain.ModAnonymous {
				return true, "Domain policy requires moderation on comments by unregistered users", nil
			}
		}
	}

	// Check link/image moderation policy
	html := strings.ToLower(comment.HTML)
	if domain.ModLinks && strings.Contains(html, "<a") {
		return true, "Comment contains a link", nil
	} else if domain.ModImages && strings.Contains(html, "<img") {
		return true, "Comment contains an image", nil
	}

	// Test the comment against online checkers
	ctx := &commentScanningContext{
		Request:    req,
		Comment:    comment,
		Domain:     domain,
		Page:       page,
		User:       user,
		DomainUser: domainUser,
		IsEdit:     isEdit,
	}
	if b, reason, err := svc.scan(ctx); b && err == nil {
		// Don't consider inappropriate if an error occurred
		return true, reason, nil
	}

	// No need to moderate
	return false, "", nil
}

// Scan scans the provided comment for inappropriate content and returns whether it was found
func (svc *perlustrationService) scan(ctx *commentScanningContext) (bool, string, error) {
	// Fetch domain extensions
	extensions, err := Services.DomainService(nil).ListDomainExtensions(&ctx.Domain.ID)
	if err != nil {
		return false, "", err
	}

	// Iterate known comment scanners
	var lastErr error
	for _, cs := range svc.scanners {
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
			if b, reason, err := cs.Scan(ex.ConfigParams(), ctx); err != nil {
				lastErr = err
			} else if b {
				// Exit on a first positive
				return true, reason, nil
			}
		}
	}

	// Return a (tentative) negative and any occurred error
	return false, "", lastErr
}

//----------------------------------------------------------------------------------------------------------------------

// apiScanner is a base generic CommentScanner that requires an API key
type apiScanner struct {
	apiKey string
}

func (s *apiScanner) KeyProvided() bool {
	return s.apiKey != ""
}

//----------------------------------------------------------------------------------------------------------------------

// akismetScanner is a CommentScanner that uses Akismet for comment content checking
type akismetScanner struct {
	apiScanner
}

func (s *akismetScanner) ID() models.DomainExtensionID {
	return models.DomainExtensionIDAkismet
}

func (s *akismetScanner) Scan(config map[string]string, ctx *commentScanningContext) (bool, string, error) {
	// Check if the service is usable: the locally configured API key takes precedence
	apiKey := config["apiKey"]
	if apiKey == "" {
		apiKey = s.apiKey
	}
	if apiKey == "" {
		return false, "", errors.New("no Akismet API key configured")
	}

	// Prepare a request
	d := url.Values{
		"api_key":              {apiKey},
		"blog":                 {ctx.Domain.RootURL()},
		"user_ip":              {util.UserIP(ctx.Request)},
		"user_agent":           {util.UserAgent(ctx.Request)},
		"referrer":             {ctx.Request.Header.Get("Referer")},
		"permalink":            {ctx.Domain.RootURL() + ctx.Page.Path},
		"comment_type":         {"comment"},
		"comment_author":       {ctx.User.Name},
		"comment_author_email": {ctx.User.Email},
		"comment_author_url":   {ctx.User.WebsiteURL},
		"comment_content":      {ctx.Comment.Markdown},
		"comment_date_gmt":     {ctx.Comment.CreatedTime.UTC().Format(time.RFC3339)},
		"blog_charset":         {"UTF-8"},
	}
	if ctx.IsEdit {
		d.Set("recheck_reason", "edit")
	}

	// Submit the form to Akismet
	client := &http.Client{}
	dataStr := d.Encode()
	logger.Debugf("Submitting comment to Akismet: %s", dataStr)
	rq, err := http.NewRequest("POST", "https://rest.akismet.com/1.1/comment-check", strings.NewReader(dataStr))
	if err != nil {
		return false, "", err
	}
	rq.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	rq.Header.Add("Content-Length", strconv.Itoa(len(dataStr)))
	resp, err := client.Do(rq)
	if err != nil {
		return false, "", err
	}
	defer util.LogError(resp.Body.Close, "akismetScanner.Scan, resp.Body.Close()")

	// Fetch the response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", err
	}
	logger.Debugf("Akismet response: %s", respBody)

	// Check the content
	switch string(respBody) {
	case "true":
		return true, "Akismet identified the comment as spam", nil
	case "false":
		return false, "", nil
	}
	return false, "", fmt.Errorf("failed to call Akismet API: %s", respBody)
}

//----------------------------------------------------------------------------------------------------------------------

// perspectiveScanner is a CommentScanner that uses Perspective for comment content checking
type perspectiveScanner struct {
	apiScanner
}

type perspectiveAttrScore struct {
	SummaryScore struct {
		Value float64 `json:"value"`
	} `json:"summaryScore"`
}

type perspectiveResponse struct {
	AttributeScores struct {
		Toxicity       perspectiveAttrScore `json:"TOXICITY"`
		SevereToxicity perspectiveAttrScore `json:"SEVERE_TOXICITY"`
		IdentityAttack perspectiveAttrScore `json:"IDENTITY_ATTACK"`
		Insult         perspectiveAttrScore `json:"INSULT"`
		Profanity      perspectiveAttrScore `json:"PROFANITY"`
		Threat         perspectiveAttrScore `json:"THREAT"`
	} `json:"attributeScores"`
}

func (s *perspectiveScanner) ID() models.DomainExtensionID {
	return models.DomainExtensionIDPerspective
}

func (s *perspectiveScanner) Scan(config map[string]string, ctx *commentScanningContext) (bool, string, error) {
	// Check if the service is usable: the locally configured API key takes precedence
	apiKey := config["apiKey"]
	if apiKey == "" {
		apiKey = s.apiKey
	}
	if apiKey == "" {
		return false, "", errors.New("no Perspective API key configured")
	}

	// Identify requested attributes
	y := struct{}{} // Translates to an empty JSON object
	attrs := make(map[string]any)
	toxicity := util.StrToFloatDef(config["toxicity"], 1)
	severeToxicity := util.StrToFloatDef(config["severeToxicity"], 1)
	identityAttack := util.StrToFloatDef(config["identityAttack"], 1)
	insult := util.StrToFloatDef(config["insult"], 1)
	profanity := util.StrToFloatDef(config["profanity"], 1)
	threat := util.StrToFloatDef(config["threat"], 1)

	if toxicity < 1 {
		attrs["TOXICITY"] = y
	}
	if severeToxicity < 1 {
		attrs["SEVERE_TOXICITY"] = y
	}
	if identityAttack < 1 {
		attrs["IDENTITY_ATTACK"] = y
	}
	if insult < 1 {
		attrs["INSULT"] = y
	}
	if profanity < 1 {
		attrs["PROFANITY"] = y
	}
	if threat < 1 {
		attrs["THREAT"] = y
	}

	// If there are no attributes, it makes no sense to send the request
	if len(attrs) == 0 {
		return false, "", nil
	}

	// Prepare a request
	d, err := json.Marshal(map[string]any{
		"comment":             map[string]any{"text": ctx.Comment.Markdown},
		"requestedAttributes": attrs,
	})
	if err != nil {
		return false, "", err
	}

	// Submit a request to Perspective
	client := &http.Client{}
	rq, err := http.NewRequest(
		"POST",
		fmt.Sprintf("https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=%s", apiKey),
		bytes.NewReader(d))
	if err != nil {
		return false, "", err
	}
	rq.Header.Add("Content-Type", "application/json")

	// Fetch the response
	resp, err := client.Do(rq)
	if err != nil {
		return false, "", err
	}
	defer util.LogError(resp.Body.Close, "perspectiveScanner.Scan, resp.Body.Close()")
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", err
	}
	logger.Debugf("Perspective response: %s", body)

	// Unmarshal the response
	var result perspectiveResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return false, "", err
	}

	// Check the scores. Those not returned will be set to 0
	if v := result.AttributeScores.Toxicity.SummaryScore.Value; v > toxicity {
		return true, fmt.Sprintf("Perspective toxicity threshold (%v) exceeded (actual value %v)", toxicity, v), nil
	}
	if v := result.AttributeScores.SevereToxicity.SummaryScore.Value; v > severeToxicity {
		return true, fmt.Sprintf("Perspective severeToxicity threshold (%v) exceeded (actual value %v)", severeToxicity, v), nil
	}
	if v := result.AttributeScores.IdentityAttack.SummaryScore.Value; v > identityAttack {
		return true, fmt.Sprintf("Perspective identityAttack threshold (%v) exceeded (actual value %v)", identityAttack, v), nil
	}
	if v := result.AttributeScores.Insult.SummaryScore.Value; v > insult {
		return true, fmt.Sprintf("Perspective insult threshold (%v) exceeded (actual value %v)", insult, v), nil
	}
	if v := result.AttributeScores.Profanity.SummaryScore.Value; v > profanity {
		return true, fmt.Sprintf("Perspective profanity threshold (%v) exceeded (actual value %v)", profanity, v), nil
	}
	if v := result.AttributeScores.Threat.SummaryScore.Value; v > threat {
		return true, fmt.Sprintf("Perspective threat threshold (%v) exceeded (actual value %v)", threat, v), nil
	}

	// Succeeded
	return false, "", nil
}

//----------------------------------------------------------------------------------------------------------------------

// apiLayerSpamCheckerScanner is a CommentScanner that uses APILayer SpamChecker for comment content checking
type apiLayerSpamCheckerScanner struct {
	apiScanner
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

func (s *apiLayerSpamCheckerScanner) Scan(config map[string]string, ctx *commentScanningContext) (bool, string, error) {
	// Check if the service is usable: the locally configured API key takes precedence
	apiKey := config["apiKey"]
	if apiKey == "" {
		apiKey = s.apiKey
	}
	if apiKey == "" {
		return false, "", errors.New("no APILayer SpamChecker API key configured")
	}

	// Submit a request to the APILayer
	client := &http.Client{}
	rq, err := http.NewRequest(
		"POST",
		fmt.Sprintf("https://api.apilayer.com/spamchecker?threshold=%s", config["threshold"]),
		strings.NewReader(ctx.Comment.Markdown))
	if err != nil {
		return false, "", err
	}
	rq.Header.Set("apikey", apiKey)

	// Fetch the response
	resp, err := client.Do(rq)
	if err != nil {
		return false, "", err
	}
	defer util.LogError(resp.Body.Close, "apiLayerSpamCheckerScanner.Scan, resp.Body.Close()")
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", err
	}
	logger.Debugf("APILayer SpamChecker response: %s", body)

	// Unmarshal the response
	var result apiLayerSpamCheckerResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return false, "", err
	}

	// If it's spam
	if result.IsSpam {
		return true, "APILayer SpamChecker returned: " + result.Result, nil
	}

	// Succeeded
	return false, "", nil
}
