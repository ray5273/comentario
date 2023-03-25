package svc

import (
	"gitlab.com/comentario/comentario/internal/api/models"
	"time"
)

// TheVoteService is a global VoteService implementation
var TheVoteService VoteService = &voteService{}

// VoteService is a service interface for dealing with comment votes
type VoteService interface {
	// DeleteByHost deletes all votes for the specified host
	DeleteByHost(host models.Host) error
	// SetVote inserts or updates a vote for the given comment and commenter
	SetVote(commentHex, commenterHex models.HexID, direction int) error
}

//----------------------------------------------------------------------------------------------------------------------

// voteService is a blueprint VoteService implementation
type voteService struct{}

func (svc *voteService) DeleteByHost(host models.Host) error {
	logger.Debugf("voteService.DeleteByHost(%s)", host)

	// Delete the records in the database
	if err := db.Exec("delete from votes v using comments c where c.commenthex=v.commenthex and c.domain=$1;", host); err != nil {
		logger.Errorf("voteService.DeleteByHost: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *voteService) SetVote(commentHex, commenterHex models.HexID, direction int) error {
	logger.Debugf("voteService.SetVote(%s, %s, %d)", commentHex, commenterHex, direction)

	// Upsert a row
	err := db.Exec(
		"insert into votes(commenthex, commenterhex, direction, votedate) values($1, $2, $3, $4) "+
			"on conflict (commenthex, commenterhex) do update set direction = $3;",
		commentHex,
		commenterHex,
		direction,
		time.Now().UTC())
	if err != nil {
		logger.Errorf("voteService.SetVote: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}
