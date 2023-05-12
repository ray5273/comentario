package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_commenter"
	"gitlab.com/comentario/comentario/internal/svc"
)

func EmailGet(params api_commenter.EmailGetParams) middleware.Responder {
	// Fetch the email by its unsubscribe token
	email, err := svc.TheEmailService.FindByUnsubscribeToken(*params.Body.UnsubscribeSecretHex)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewEmailGetOK().WithPayload(&api_commenter.EmailGetOKBody{Email: email})
}

func EmailModerate(params api_commenter.EmailModerateParams) middleware.Responder {
	// Find the comment
	comment, err := svc.TheCommentService.FindByHexID(models.HexID(params.CommentHex))
	if err != nil {
		return respServiceError(err)
	}

	// Verify the comment isn't deleted yet
	if comment.Deleted {
		return respBadRequest(ErrorCommentDeleted)
	}

	// Fetch the email by its unsubscribe token
	email, err := svc.TheEmailService.FindByUnsubscribeToken(models.HexID(params.UnsubscribeSecretHex))
	if err != nil {
		return respServiceError(err)
	}

	// Verify the user is a domain moderator
	if r := Verifier.UserIsDomainModerator(string(email.Email), comment.Host); r != nil {
		return r
	}

	// TODO this must be changed to using hex ID or IdP
	// Find (any) commenter with that email
	commenter, err := svc.TheUserService.FindCommenterByEmail(string(email.Email))
	if err != nil {
		return respServiceError(err)
	}

	// Perform the appropriate action
	switch params.Action {
	case "approve":
		if err := svc.TheCommentService.Approve(comment.CommentHex); err != nil {
			return respServiceError(err)
		}
	case "delete":
		if err := svc.TheCommentService.MarkDeleted(comment.CommentHex, commenter.HexID); err != nil {
			return respServiceError(err)
		}
	default:
		return respBadRequest(ErrorInvalidModAction)
	}

	// Succeeded
	// TODO redirect to a proper page instead of letting the user see JSON response
	return api_commenter.NewEmailModerateNoContent()
}

func EmailUpdate(params api_commenter.EmailUpdateParams) middleware.Responder {
	// Update the email record
	err := svc.TheEmailService.UpdateByEmailToken(
		string(params.Body.Email.Email),
		params.Body.Email.UnsubscribeSecretHex,
		params.Body.Email.SendReplyNotifications,
		params.Body.Email.SendModeratorNotifications)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewEmailUpdateNoContent()
}
