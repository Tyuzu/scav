package models

import "time"

type NotificationPreferences struct {
	ID     string `bson:"_id" json:"id"`
	UserID string `bson:"userId" json:"userId"`

	MentionsEnabled bool `bson:"mentionsEnabled" json:"mentionsEnabled"`
	FollowsEnabled  bool `bson:"followsEnabled" json:"followsEnabled"`
	CommentsEnabled bool `bson:"commentsEnabled" json:"commentsEnabled"`
	LikesEnabled    bool `bson:"likesEnabled" json:"likesEnabled"`
	MessagesEnabled bool `bson:"messagesEnabled" json:"messagesEnabled"`

	AllEnabled bool `bson:"allEnabled" json:"allEnabled"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
