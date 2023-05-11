package data

import (
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
