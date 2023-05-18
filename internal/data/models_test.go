package data

import (
	"github.com/google/uuid"
	"testing"
)

func TestDomainUser_IsReadonly(t *testing.T) {
	tests := []struct {
		name string
		du   *DomainUser
		want bool
	}{
		{"nil                      ", nil, false},
		{"owner                    ", &DomainUser{IsOwner: true}, false},
		{"owner/moderator          ", &DomainUser{IsOwner: true, IsModerator: true}, false},
		{"owner/commenter          ", &DomainUser{IsOwner: true, IsCommenter: true}, false},
		{"owner/moderator/commenter", &DomainUser{IsOwner: true, IsModerator: true, IsCommenter: true}, false},
		{"moderator                ", &DomainUser{IsModerator: true}, false},
		{"moderator/commenter      ", &DomainUser{IsModerator: true, IsCommenter: true}, false},
		{"commenter                ", &DomainUser{IsCommenter: true}, false},
		{"readonly                 ", &DomainUser{}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.du.IsReadonly(); got != tt.want {
				t.Errorf("IsReadonly() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDomainPage_DisplayTitle(t *testing.T) {
	tests := []struct {
		name  string
		title string
		host  string
		path  string
		want  string
	}{
		{"title set   ", "Blah-bluh", "localhost", "/path", "Blah-bluh"},
		{"no title set", "", "localhost", "/path", "localhost/path"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := &DomainPage{Path: tt.path, Title: tt.title}
			d := &Domain{Host: tt.host}
			if got := p.DisplayTitle(d); got != tt.want {
				t.Errorf("DisplayTitle() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestComment_IsAnonymous(t *testing.T) {
	tests := []struct {
		name string
		uid  uuid.NullUUID
		want bool
	}{
		{"null         ", uuid.NullUUID{}, true},
		{"nonexistent  ", uuid.NullUUID{UUID: uuid.MustParse("477649e8-d122-480c-b183-c3e80e998276")}, true},
		{"anonymous    ", uuid.NullUUID{UUID: AnonymousUser.ID, Valid: true}, true},
		{"existing user", uuid.NullUUID{UUID: uuid.MustParse("477649e8-d122-480c-b183-c3e80e998276"), Valid: true}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Comment{UserCreated: tt.uid}
			if got := c.IsAnonymous(); got != tt.want {
				t.Errorf("IsAnonymous() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestComment_IsRoot(t *testing.T) {
	tests := []struct {
		name     string
		parentID uuid.NullUUID
		want     bool
	}{
		{"root", uuid.NullUUID{}, true},
		{"non-root", uuid.NullUUID{Valid: true}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Comment{ParentID: tt.parentID}
			if got := c.IsRoot(); got != tt.want {
				t.Errorf("IsRoot() = %v, want %v", got, tt.want)
			}
		})
	}
}
