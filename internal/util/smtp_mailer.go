package util

import (
	"crypto/tls"
	"gitlab.com/comentario/comentario/internal/intf"
	"gopkg.in/gomail.v2"
)

// NewSMTPMailer instantiates a new Mailer capable of sending out emails using SMTP
func NewSMTPMailer(host string, port int, username, password, emailFrom string, insecure, useSSL, useTLS bool) intf.Mailer {
	m := &smtpMailer{
		emailFrom: emailFrom,
		dialer:    gomail.NewDialer(host, port, username, password),
	}

	// Configure encryption settings
	m.dialer.SSL = useSSL
	if useSSL || useTLS {
		m.dialer.TLSConfig = &tls.Config{ServerName: host}
		if insecure {
			m.dialer.TLSConfig.InsecureSkipVerify = true
		}
	}
	return m
}

// smtpMailer is a Mailer implementation that sends emails using the specified SMTP server
type smtpMailer struct {
	emailFrom string
	dialer    *gomail.Dialer
}

func (m *smtpMailer) Operational() bool {
	return true
}

func (m *smtpMailer) Mail(replyTo, recipient, subject, htmlMessage string, embedFiles ...string) error {
	// Compose an email
	msg := gomail.NewMessage()
	msg.SetHeader("From", m.emailFrom)
	msg.SetHeader("To", recipient)
	msg.SetHeader("Subject", subject)
	msg.SetBody("text/html", htmlMessage)
	if replyTo != "" {
		msg.SetHeader("Reply-To", replyTo)
	}

	// Embed files
	for _, file := range embedFiles {
		msg.Embed(file)
	}

	// Send it out
	return m.dialer.DialAndSend(msg)
}
