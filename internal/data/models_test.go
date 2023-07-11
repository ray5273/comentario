package data

import (
	"github.com/google/uuid"
	"reflect"
	"testing"
	"time"
)

func TestDomain_AsNonOwner(t *testing.T) {
	tests := []struct {
		name   string
		domain *Domain
		want   *Domain
	}{
		{"zero  ", &Domain{}, &Domain{CountComments: -1, CountViews: -1}},
		{"filled", &Domain{
			ID:               uuid.MustParse("12345678-1234-1234-1234-1234567890ab"),
			Name:             "Foo",
			Host:             "Bar",
			CreatedTime:      time.Now(),
			IsHTTPS:          true,
			IsReadonly:       true,
			AuthAnonymous:    true,
			AuthLocal:        true,
			AuthSSO:          true,
			SSOURL:           "https://foo.com",
			SSOSecret:        []byte("secret"),
			ModAnonymous:     true,
			ModAuthenticated: true,
			ModNumComments:   13,
			ModUserAgeDays:   42,
			ModLinks:         true,
			ModImages:        true,
			ModNotifyPolicy:  DomainModNotifyPolicyPending,
			DefaultSort:      "ta",
			CountComments:    394856,
			CountViews:       1241242345,
		},
			&Domain{
				ID:            uuid.MustParse("12345678-1234-1234-1234-1234567890ab"),
				Host:          "Bar",
				IsHTTPS:       true,
				IsReadonly:    true,
				AuthAnonymous: true,
				AuthLocal:     true,
				AuthSSO:       true,
				SSOURL:        "https://foo.com",
				DefaultSort:   "ta",
				CountComments: -1,
				CountViews:    -1,
			}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.domain.AsNonOwner(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("AsNonOwner() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDomainUser_AgeInDays(t *testing.T) {
	tests := []struct {
		name string
		u    *DomainUser
		want int
	}{
		{"nil            ", nil, 0},
		{"now            ", &DomainUser{CreatedTime: time.Now().UTC()}, 0},
		{"less than a day", &DomainUser{CreatedTime: time.Now().UTC().AddDate(0, 0, -1).Add(time.Second)}, 0},
		{"3 days         ", &DomainUser{CreatedTime: time.Now().UTC().AddDate(0, 0, -3)}, 3},
		{"687 days       ", &DomainUser{CreatedTime: time.Now().UTC().AddDate(0, 0, -687)}, 687},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.u.AgeInDays(); got != tt.want {
				t.Errorf("AgeInDays() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDomainUser_CanModerate(t *testing.T) {
	tests := []struct {
		name string
		du   *DomainUser
		want bool
	}{
		{"nil                      ", nil, false},
		{"owner                    ", &DomainUser{IsOwner: true}, true},
		{"owner/moderator          ", &DomainUser{IsOwner: true, IsModerator: true}, true},
		{"owner/commenter          ", &DomainUser{IsOwner: true, IsCommenter: true}, true},
		{"owner/moderator/commenter", &DomainUser{IsOwner: true, IsModerator: true, IsCommenter: true}, true},
		{"moderator                ", &DomainUser{IsModerator: true}, true},
		{"moderator/commenter      ", &DomainUser{IsModerator: true, IsCommenter: true}, true},
		{"commenter                ", &DomainUser{IsCommenter: true}, false},
		{"readonly                 ", &DomainUser{}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.du.CanModerate(); got != tt.want {
				t.Errorf("CanModerate() = %v, want %v", got, tt.want)
			}
		})
	}
}

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
