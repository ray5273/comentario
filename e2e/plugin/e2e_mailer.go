package main

import (
	"fmt"
	"gitlab.com/comentario/comentario/internal/intf"
)

// e2eMailer is a Mailer implementation that stores emails in memory instead of sending them out
type e2eMailer struct {
	mails     []intf.MockMail // Sent emails
	failEmail map[string]bool // Map of emails to fail -> true
}

func (m *e2eMailer) Operational() bool {
	return true
}

// addFailure adds the given email address to the failure recipient list
func (m *e2eMailer) addFailure(email string) {
	if m.failEmail == nil {
		m.failEmail = make(map[string]bool)
	}
	m.failEmail[email] = true
}

func (m *e2eMailer) Mail(replyTo, recipient, subject, htmlMessage string, embedFiles ...string) error {
	// Verify if the email "sending" must fail
	failure := m.failEmail[recipient]

	// Store a mock email
	msg := &intf.MockMail{
		Headers: map[string]string{
			"From":    "noreply@localhost",
			"To":      recipient,
			"Subject": subject,
		},
		EmbedFiles: embedFiles,
		Body:       htmlMessage,
		Succeeded:  !failure,
	}
	if replyTo != "" {
		msg.Headers["Reply-To"] = replyTo
	}

	// Store the email
	m.mails = append(m.mails, *msg)

	if failure {
		return fmt.Errorf("simulated sending failure to %s", recipient)
	}
	return nil
}
