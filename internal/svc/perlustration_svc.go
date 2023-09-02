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

// ThePerlustrationService is a global PerlustrationService implementation
var ThePerlustrationService PerlustrationService = &perlustrationService{}

// CommentScanningContext is a context for scanning a comment
type CommentScanningContext struct {
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
	// Scan scans the provided comment for inappropriate content and returns whether it was found
	Scan(config map[string]string, ctx *CommentScanningContext) (bool, error)
}

// PerlustrationService is a collection of CommentScanners that allows to scan comments against those of them enabled
// for the given domain
type PerlustrationService interface {
	// Init the service
	Init()
	// Scan scans the provided comment for inappropriate content and returns whether it was found
	Scan(ctx *CommentScanningContext) (bool, error)
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

func (svc *perlustrationService) Scan(ctx *CommentScanningContext) (bool, error) {
	// Fetch domain extensions
	extensions, err := TheDomainService.ListDomainExtensions(&ctx.Domain.ID)
	if err != nil {
		return false, err
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
			if b, err := cs.Scan(ex.ConfigParams(), ctx); err != nil {
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

func (s *akismetScanner) Scan(config map[string]string, ctx *CommentScanningContext) (bool, error) {
	// Check if the service is usable: the locally configured API key takes precedence
	apiKey := config["apiKey"]
	if apiKey == "" {
		apiKey = s.apiKey
	}
	if apiKey == "" {
		return false, errors.New("no Akismet API key configured")
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

func (s *perspectiveScanner) Scan(config map[string]string, ctx *CommentScanningContext) (bool, error) {
	// Check if the service is usable: the locally configured API key takes precedence
	apiKey := config["apiKey"]
	if apiKey == "" {
		apiKey = s.apiKey
	}
	if apiKey == "" {
		return false, errors.New("no Perspective API key configured")
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
		return false, nil
	}

	// Prepare a request
	d, err := json.Marshal(map[string]any{
		"comment":             map[string]any{"text": ctx.Comment.Markdown},
		"requestedAttributes": attrs,
	})
	if err != nil {
		return false, err
	}

	// Submit a request to Perspective
	client := &http.Client{}
	rq, err := http.NewRequest(
		"POST",
		fmt.Sprintf("https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=%s", apiKey),
		bytes.NewReader(d))
	if err != nil {
		return false, err
	}
	rq.Header.Add("Content-Type", "application/json")

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

	// Check the scores. Those not returned will be set to 0
	b := result.AttributeScores.Toxicity.SummaryScore.Value > toxicity ||
		result.AttributeScores.SevereToxicity.SummaryScore.Value > severeToxicity ||
		result.AttributeScores.IdentityAttack.SummaryScore.Value > identityAttack ||
		result.AttributeScores.Insult.SummaryScore.Value > insult ||
		result.AttributeScores.Profanity.SummaryScore.Value > profanity ||
		result.AttributeScores.Threat.SummaryScore.Value > threat

	// Succeeded
	return b, nil
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

func (s *apiLayerSpamCheckerScanner) Scan(config map[string]string, ctx *CommentScanningContext) (bool, error) {
	// Check if the service is usable: the locally configured API key takes precedence
	apiKey := config["apiKey"]
	if apiKey == "" {
		apiKey = s.apiKey
	}
	if apiKey == "" {
		return false, errors.New("no APILayer SpamChecker API key configured")
	}

	// Submit a request to the APILayer
	client := &http.Client{}
	rq, err := http.NewRequest(
		"POST",
		fmt.Sprintf("https://api.apilayer.com/spamchecker?threshold=%s", config["threshold"]),
		strings.NewReader(ctx.Comment.Markdown))
	if err != nil {
		return false, err
	}
	rq.Header.Set("apikey", apiKey)

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
