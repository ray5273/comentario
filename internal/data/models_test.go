package data

import (
	"database/sql"
	"github.com/google/uuid"
	"reflect"
	"testing"
	"time"
)

func TestUser_ColourIndex(t *testing.T) {
	tests := []struct {
		id   string
		want byte
	}{
		{"3bcdd9c0-5e9b-4724-9d87-8c520fb2b5c2", 11},
		{"b5cacc60-6d24-45ca-af03-c62e863587b5", 44},
		{"a15d2d4c-4353-44a2-a796-66ca2a3924ca", 33},
		{"2489fefb-c278-491e-8597-1729079c2b6d", 18},
		{"ae52ce11-6eb4-43ee-9fdf-5142a3df934f", 55},
		{"0272e06c-1568-46c6-b973-e2f1dd5bf3cc", 27},
		{"0aa47b8e-841f-45d5-95ba-3b0c56a702de", 27},
		{"ff3a0149-1b90-4bf1-9925-07d92e75f4af", 10},
		{"ed9395a8-a707-45d4-baef-8121e7db894c", 6},
		{"b248cd26-d79c-490d-ab56-6ccedb7a85c0", 27},
		{"12555fbd-6845-4562-bcc5-26a3d6142405", 28},
		{"172be5cc-d1fd-4fb3-9a3b-c3e9b1f73d32", 55},
		{"990f0eb6-38f3-4afd-9f9b-528828d6b308", 43},
		{"d9aa42bf-c7ad-46b1-9529-53df86567b2c", 46},
		{"985c145b-0659-47c1-b672-c43cfe5047b1", 48},
		{"1f3ede50-8223-44d8-89ad-3fd4c57cd64e", 2},
		{"7b3ee2e7-3fee-4563-9305-176c854809d3", 19},
		{"52cb5759-bbbf-4038-ab26-1db1e59b941b", 13},
		{"b594b045-884b-4c5d-a583-7389e7c8dc8e", 15},
		{"fd92d24f-0807-418a-87c4-e0f0d2b0b95d", 25},
		{"5da851c3-fe90-4239-83af-3f5f32cf6a1f", 56},
		{"d4419e50-7229-4756-a61e-f582f6e04b17", 46},
		{"56603812-4aa2-45b9-b4f4-a6295d3826d6", 38},
		{"557bfb71-e8c1-477f-83eb-12e26999ea5a", 47},
		{"4b3d4a1b-934a-428b-83d5-1bd01ed8e68b", 57},
		{"428974f7-d881-4896-ba6e-52a9af16c612", 53},
		{"a021b32b-6b09-4399-b8e6-d5ba20c8cd53", 44},
		{"087b490c-6105-45fe-bbb7-c26af1779242", 23},
		{"b4a08821-11f6-456b-b5bf-b2b75e4e6784", 48},
		{"d32b638c-30b4-43eb-9ee1-d332e2c74dbb", 16},
		{"3659118b-a6d7-41ce-8218-e9976e2199d8", 21},
		{"1963fe6e-5a5d-48d0-aac6-0590de6a1949", 34},
		{"b750ca66-844b-434f-8fb9-6fff8ec7afe2", 16},
		{"932410b5-2a90-48c5-af70-e6976a956118", 19},
		{"6dfad19b-3785-4821-956d-25a877d0eb30", 49},
		{"35338874-21d0-4a2a-9cf5-33b67532f676", 18},
		{"b2aaeb80-b612-48cc-b780-6622fed2142e", 4},
		{"1b5a5b07-d5c2-45fc-bc0b-156c12916bf7", 48},
		{"9ec8644f-6517-452f-a5d2-18a5b5540210", 4},
		{"dacd724d-d0e8-4e0e-93d7-f032109efef3", 9},
		{"2f7561be-ab77-4701-98be-01afcb874909", 11},
		{"d9a07e2c-07b0-42cf-8113-6f00de1d9e49", 4},
		{"2507e99e-7c3d-48b6-bb39-cf037383798d", 36},
		{"8d5ed092-602a-47bb-a357-48c932f5742a", 41},
		{"3de7fc93-496e-49bb-9bac-4b9769702ae4", 14},
		{"42c5e874-8b44-4828-98d4-b1c438ceb1d6", 40},
		{"51e80b88-c7ae-4db1-8e13-f1995f58e2f4", 15},
		{"0c6bc25d-c792-481a-9110-90a178f49fb1", 35},
		{"227b3e72-9cf6-457c-89cc-45a0ebd47378", 20},
		{"d102e1d1-42b1-4ee0-87ab-2d6ef7a0ae63", 51},
		{"26433311-0e35-48e2-9230-51bcaa688846", 41},
		{"c549c5b3-1ddc-469d-9502-03127f85d160", 59},
		{"649a7711-7482-490f-a46b-2e98bd495707", 49},
		{"79756dc6-4057-481f-a9c2-ae2fa6d9f844", 42},
		{"b5c36ab4-d91d-4674-890d-90897fd4ea91", 23},
		{"089b2d1b-8128-4b9e-a68b-6b83e1e1971d", 10},
		{"33021271-116d-4a5d-b41a-6e207928d3f5", 2},
		{"722df68a-36d1-4faa-a99e-f12382c1ce99", 0},
		{"f8304d03-6f56-4bd3-a4a1-59e723c32e4a", 54},
		{"d9419dfd-d7d3-4921-8b68-24b00b39d2a6", 23},
		{"a2b7525f-91b9-443e-b6b4-0a6420acf667", 27},
		{"a4e861cf-c0aa-4467-9cd5-3bbf91405971", 43},
		{"ef1f2f2e-cc25-4419-859e-4aec353e6174", 6},
		{"0227e633-393d-4f55-905b-fbe87955beef", 37},
		{"a2b5a13f-4df4-4abc-8d0b-a861e9206586", 27},
		{"3da5ed4c-af97-4fec-ad14-ef9b03b41c54", 22},
		{"b65231bb-79a8-4103-9df0-6458884b0522", 12},
		{"f4e6ef68-4285-4782-9969-896535d0cc8b", 37},
		{"62762d75-d5af-4e9a-b71c-df5225000dbc", 12},
		{"2c5503e1-c2ef-4c8d-9c86-6e4631667ba5", 56},
		{"f0d0c1de-3b15-44d5-81b9-f59c20032f03", 44},
		{"b7ce595b-9a0b-49ee-83d1-6b74960e299b", 48},
		{"0ae1c3a3-4da3-4336-b65b-16dd4aff074e", 24},
		{"5e042fb2-93c6-4fd4-a3cb-744e0e835907", 20},
		{"ffc8a2a3-8a68-46bf-a1b2-29dd1acd25ab", 43},
		{"a1a80515-8e47-457f-85c0-8d6c049d24c8", 55},
		{"64cd0315-6d9b-41dc-bf21-fa98e01f319a", 42},
		{"db9910fc-a0a4-439d-b950-f0b69e883ecc", 35},
		{"4c9c04cf-8958-46f8-a1ea-0dc0ccd9a89f", 54},
		{"38b39174-2bb2-4e71-9148-2646eb55ff37", 3},
		{"12a41d7a-a8bd-4e7a-847e-b90a8d22650a", 9},
		{"15606012-e305-455f-9f7d-9d56c202e728", 1},
		{"ca59b914-c819-4502-a579-6b6b3d11cebc", 24},
		{"6d739f9f-47a6-4059-a547-904da1fdd82d", 24},
		{"864919d7-4812-4c70-8d79-4271b69abf71", 6},
		{"5c81bcf6-9c70-426d-88b0-2dbc29c23848", 26},
		{"9508e54e-f86f-4a57-a6c4-a2a0230c4f19", 19},
		{"6d8528b8-82f8-4ad2-b5b6-efba86247890", 10},
		{"3a2ff010-209f-4999-90ae-6bee2720afb7", 10},
		{"82a9f5e7-5d40-4297-bee3-98671ece6ca8", 53},
		{"0c542e15-8ceb-4543-bbe0-f199476b51db", 37},
		{"0a5ccffc-2eb4-4008-8db3-1fb4b177a59f", 30},
		{"dce9e1a0-dfeb-497f-88bd-c0ce835aace4", 20},
		{"c61500fb-0b7f-4bc2-8696-6149aa9c1097", 24},
		{"6fcb3173-3a00-4aa5-8113-e39767b469a7", 56},
		{"affa7920-67cc-4f0e-bed5-8c58b1abee5f", 10},
		{"6c1be150-ea21-4ffd-b6ca-c18981d7d6eb", 26},
		{"c03b9b58-b2bb-4942-adca-168e7d812d8c", 56},
		{"84a766a2-7154-4d7f-8307-20ec9df4fc68", 27},
		{"828f1362-37ae-4c8f-83e7-84801f84b6a8", 53},
	}
	for _, tt := range tests {
		t.Run(tt.id, func(t *testing.T) {
			u := &User{ID: uuid.MustParse(tt.id)}
			if got := u.ColourIndex(); got != tt.want {
				t.Errorf("ColourIndex() = %v, want %v", got, tt.want)
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

func TestDomainUser_IsACommenter(t *testing.T) {
	tests := []struct {
		name string
		du   *DomainUser
		want bool
	}{
		{"nil                      ", nil, true},
		{"owner                    ", &DomainUser{IsOwner: true}, false},
		{"owner/moderator          ", &DomainUser{IsOwner: true, IsModerator: true}, false},
		{"owner/commenter          ", &DomainUser{IsOwner: true, IsCommenter: true}, true},
		{"owner/moderator/commenter", &DomainUser{IsOwner: true, IsModerator: true, IsCommenter: true}, true},
		{"moderator                ", &DomainUser{IsModerator: true}, false},
		{"moderator/commenter      ", &DomainUser{IsModerator: true, IsCommenter: true}, true},
		{"commenter                ", &DomainUser{IsCommenter: true}, true},
		{"readonly                 ", &DomainUser{}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.du.IsACommenter(); got != tt.want {
				t.Errorf("IsACommenter() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDomainUser_IsAModerator(t *testing.T) {
	tests := []struct {
		name string
		du   *DomainUser
		want bool
	}{
		{"nil                      ", nil, false},
		{"owner                    ", &DomainUser{IsOwner: true}, false},
		{"owner/moderator          ", &DomainUser{IsOwner: true, IsModerator: true}, true},
		{"owner/commenter          ", &DomainUser{IsOwner: true, IsCommenter: true}, false},
		{"owner/moderator/commenter", &DomainUser{IsOwner: true, IsModerator: true, IsCommenter: true}, true},
		{"moderator                ", &DomainUser{IsModerator: true}, true},
		{"moderator/commenter      ", &DomainUser{IsModerator: true, IsCommenter: true}, true},
		{"commenter                ", &DomainUser{IsCommenter: true}, false},
		{"readonly                 ", &DomainUser{}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.du.IsAModerator(); got != tt.want {
				t.Errorf("IsAModerator() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDomainUser_IsAnOwner(t *testing.T) {
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
		{"moderator                ", &DomainUser{IsModerator: true}, false},
		{"moderator/commenter      ", &DomainUser{IsModerator: true, IsCommenter: true}, false},
		{"commenter                ", &DomainUser{IsCommenter: true}, false},
		{"readonly                 ", &DomainUser{}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.du.IsAnOwner(); got != tt.want {
				t.Errorf("IsAnOwner() = %v, want %v", got, tt.want)
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

func TestDomain_CloneWithClearance(t *testing.T) {
	d := Domain{
		ID:                uuid.MustParse("12345678-1234-1234-1234-1234567890ab"),
		Name:              "Foo",
		Host:              "Bar",
		CreatedTime:       time.Now(),
		IsHTTPS:           true,
		IsReadonly:        true,
		AuthAnonymous:     true,
		AuthLocal:         true,
		AuthSSO:           true,
		SSOURL:            "https://foo.com",
		SSOSecret:         sql.NullString{Valid: true, String: "c0ffee"},
		SSONonInteractive: true,
		ModAnonymous:      true,
		ModAuthenticated:  true,
		ModNumComments:    13,
		ModUserAgeDays:    42,
		ModLinks:          true,
		ModImages:         true,
		ModNotifyPolicy:   DomainModNotifyPolicyPending,
		DefaultSort:       "ta",
		CountComments:     394856,
		CountViews:        1241242345,
	}
	tests := []struct {
		name   string
		super  bool
		owner  bool
		domain *Domain
		want   *Domain
	}{
		{"regular user, zero", false, false, &Domain{}, &Domain{CountComments: -1, CountViews: -1}},
		{"superuser, zero", true, false, &Domain{}, &Domain{}},
		{"owner, zero", false, true, &Domain{}, &Domain{}},
		{"super & owner, zero", true, true, &Domain{}, &Domain{}},
		{"regular user, filled", false, false, &d,
			&Domain{
				ID:                uuid.MustParse("12345678-1234-1234-1234-1234567890ab"),
				Host:              "Bar",
				IsHTTPS:           true,
				IsReadonly:        true,
				AuthAnonymous:     true,
				AuthLocal:         true,
				AuthSSO:           true,
				SSOURL:            "https://foo.com",
				SSONonInteractive: true,
				DefaultSort:       "ta",
				CountComments:     -1,
				CountViews:        -1,
			}},
		{"superuser, filled", true, false, &d, &d},
		{"owner, filled", false, true, &d, &d},
		{"super & owner, filled", true, true, &d, &d},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.domain.CloneWithClearance(tt.super, tt.owner); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("CloneWithClearance() = %v, want %v", got, tt.want)
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
