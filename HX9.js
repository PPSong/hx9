Schema = {};

Schema.GroupChatMessage = new SimpleSchema({
    activityId: {
        type: String
    },
    fromUserId: {
        type: String
    },
    fromUserMark: {
        type: String
    },
    content: {
        type: String,
        optional: true
    },
    createdTime: {
        type: Date,
        denyUpdate: true,
        autoValue: function() {
            if (this.isInsert) {
                return new Date;
            } else if (this.isUpsert) {
                return {
                    $setOnInsert: new Date
                };
            } else {
                this.unset();
            }
        }
    }
});

//activity schema
Schema.Activity = new SimpleSchema({
    title: {
        type: String
    },
    description: {
        type: String,
        optional: true
    },
    personCount: {
        type: Number
    },
    image: {
        type: String,
        optional: true
    },
    start: {
        type: Date
    },
    end: {
        type: Date
    },
    place: {
        type: String
    },
    persons: {
        type: [String],
        optional: true
    },
    mine: {
        type: Boolean,
        defaultValue: true
    }
});

//activity person
Schema.ActivityPerson = new SimpleSchema({
    activityId: {
        type: String
    },
    personId: {
        type: String
    },
    mark: {
        type: Number
    },
    unreadCount: {
        type: Number,
        defaultValue: 0
    },
    like: {
        type: [String],
        optional: true
    }
});

//user schema
Schema.SelfSpecialInfo = new SimpleSchema({
    hair: {
        type: String,
        allowedValues: ['(男)竖起来(包括光头)', '(男)躺下', '(男)戴帽子', '(女)辫子/盘发', '(女)短发(齐肩,不过肩)', '(女)长发(过肩)', '(女)戴帽子']
    },
    glasses: {
        type: String,
        allowedValues: ['有', '无']

    },
    clothesType: {
        type: String,
        allowedValues: ['(男)风衣/大衣', '(男)西装/夹克/套装', '(男)运动外套/卫衣', '(男)T恤长袖', '(男)T恤短袖', '(男)马甲/背心', '(男)长袖衬衫', '(男)短袖衬衫', '(男)毛衣/羊毛绒/线衫/针织', '(女)风衣/大衣', '(女)西装/夹克/套装', '(女)运动外套/卫衣', '(女)T恤长袖', '(女)T恤短袖', '(女)马甲/背心', '(女)长袖衬衫', '(女)短袖衬衫', '(女)毛衣/羊毛绒/线衫/针织', '(女)连体裙']

    },
    clothesColor: {
        type: String,
        allowedValues: ['(男)红/紫/粉', '(男)黄', '(男)蓝/绿', '(男)白', '(男)黑', '(男)灰', '(男)彩色,且难以判断主体颜色', '(女)红/紫/粉', '(女)黄', '(女)蓝/绿', '(女)白', '(女)黑', '(女)灰', '(女)彩色,且难以判断主体颜色']
    },
    clothesStyle: {
        type: String,
        allowedValues: ['(男)纯色', '(男)线条,格子,色块', '(男)图案(抽象,卡通,画等有具体内容)', '(女)纯色', '(女)线条,格子,色块', '(女)图案(抽象,卡通,画等有具体内容)']
    },
    specialPic: {
        type: String
    }
});

Schema.UserProfile = new SimpleSchema({
    nickname: {
        type: String,
        regEx: /^.{2,25}$/
    },
    sex: {
        type: String,
        allowedValues: ['男', '女']
    },
    createdTime: {
        type: Date,
        denyUpdate: true,
        autoValue: function() {
            if (this.isInsert) {
                return new Date;
            } else if (this.isUpsert) {
                return {
                    $setOnInsert: new Date
                };
            } else {
                this.unset();
            }
        }
    },
    specialInfo: {
        type: Schema.SelfSpecialInfo,
        optional: true
    },
    specialInfoTime: {
        type: Date,
        optional: true
    },
    lastLocation: {
        type: [Number], //lng, lat
        decimal: true,
        index: '2dsphere',
        optional: true
    },
    lastLocationTime: {
        type: Date,
        optional: true
    },
    lastMeetCreateTime: {
        type: Date,
        optional: true
    },
    lastFakeTime: {
        type: Date,
        optional: true
    },
    lastRemind: {
        type: Date,
        optional: true
    },
    needUpdateSpecialInfoCount: {
        type: Number,
        defaultValue: 0
    },
    blackList: {
        type: [String],
        optional: true
    }
});

Schema.User = new SimpleSchema({
    username: {
        type: String,
        regEx: /^[a-z0-9A-Z_]{2,15}$/
    },
    profile: {
        type: Schema.UserProfile
    },
    services: {
        type: Object,
        optional: true,
        blackbox: true
    },
});
//end user schema

//meet schema
Schema.MapLoc = new SimpleSchema({
    name: {
        type: String
    },
    address: {
        type: String,
        optional: true
    },
    uid: {
        type: String,
    }
});

Schema.SpecialInfo = new SimpleSchema({
    sex: {
        type: String,
        allowedValues: ['男', '女']
    },
    hair: {
        type: String,
        allowedValues: ['(男)竖起来(包括光头)', '(男)躺下', '(男)戴帽子', '(女)辫子/盘发', '(女)短发(齐肩,不过肩)', '(女)长发(过肩)', '(女)戴帽子']
    },
    glasses: {
        type: String,
        allowedValues: ['有', '无']

    },
    clothesType: {
        type: String,
        allowedValues: ['(男)风衣/大衣', '(男)西装/夹克/套装', '(男)运动外套/卫衣', '(男)T恤长袖', '(男)T恤短袖', '(男)马甲/背心', '(男)长袖衬衫', '(男)短袖衬衫', '(男)毛衣/羊毛绒/线衫/针织', '(女)风衣/大衣', '(女)西装/夹克/套装', '(女)运动外套/卫衣', '(女)T恤长袖', '(女)T恤短袖', '(女)马甲/背心', '(女)长袖衬衫', '(女)短袖衬衫', '(女)毛衣/羊毛绒/线衫/针织', '(女)连体裙']

    },
    clothesColor: {
        type: String,
        allowedValues: ['(男)红/紫/粉', '(男)黄', '(男)蓝/绿', '(男)白', '(男)黑', '(男)灰', '(男)彩色,且难以判断主体颜色', '(女)红/紫/粉', '(女)黄', '(女)蓝/绿', '(女)白', '(女)黑', '(女)灰', '(女)彩色,且难以判断主体颜色']
    },
    clothesStyle: {
        type: String,
        allowedValues: ['(男)纯色', '(男)线条,格子,色块', '(男)图案(抽象,卡通,画等有具体内容)', '(女)纯色', '(女)线条,格子,色块', '(女)图案(抽象,卡通,画等有具体内容)']
    },
    place: {
        type: Schema.MapLoc
    }
});

Schema.Meet = new SimpleSchema({
    createrUserId: {
        type: String
    },
    createrUsername: {
        type: String
    },
    createrNickname: {
        type: String
    },
    createrSpecialPic: {
        type: String
    },
    targetUserId: {
        type: String,
        optional: true
    },
    targetUsername: {
        type: String,
        optional: true
    },
    targetNickname: {
        type: String,
        optional: true
    },
    targetSpecialPic: {
        type: String,
        optional: true
    },
    targetUnread: {
        type: Boolean,
        optional: true
    },
    createdTime: {
        type: Date,
        denyUpdate: true,
        autoValue: function() {
            if (this.isInsert) {
                return new Date;
            } else if (this.isUpsert) {
                return {
                    $setOnInsert: new Date
                };
            } else {
                this.unset();
            }
        }
    },
    confirmTime: {
        type: Date,
        optional: true
    },
    successTime: {
        type: Date,
        optional: true
    },
    status: {
        type: String,
        allowedValues: ['待确认', '待回复', '成功', '失败']
    },
    newMatchCount: {
        type: Number,
        optional: true
    },
    replyLeft: {
        type: Number,
        defaultValue: 2
    },
    personLoc: {
        type: [Number],
        decimal: true,
        index: '2dsphere'
    },
    specialInfo: {
        type: Schema.SpecialInfo
    }
});
//end meet schema

//friend schema
Schema.Friend = new SimpleSchema({
    FriendUnique: {
        type: String,
        index: true,
        unique: true,
        denyUpdate: true,
        autoValue: function() {
            if (this.isInsert) {
                var userId1 = this.field("userId1").value;
                var userId2 = this.field("userId2").value;
                return (userId1 > userId2 ? userId2 + "_" + userId1 : userId1 + "_" + userId2);
            } else {
                this.unset();
            }
        }
    },
    userId1: {
        type: String
    },
    username1: {
        type: String
    },
    nickname1: {
        type: String
    },
    friendLogo1: {
        type: String
    },
    userId2: {
        type: String
    },
    username2: {
        type: String
    },
    nickname2: {
        type: String
    },
    friendLogo2: {
        type: String
    }
});
//end friend schema

//message schema
Schema.Message = new SimpleSchema({
    fromUserId: {
        type: String
    },
    toUserId: {
        type: String
    },
    content: {
        type: String
    },
    createdTime: {
        type: Date,
        denyUpdate: true,
        autoValue: function() {
            if (this.isInsert) {
                return new Date;
            } else if (this.isUpsert) {
                return {
                    $setOnInsert: new Date
                };
            } else {
                this.unset();
            }
        }
    },
    unread: {
        type: Boolean,
        defaultValue: true
    }
});
//end message schema
Activities = new Mongo.Collection("activities");
Activities.attachSchema(Schema.Activity);

ActivitiePersons = new Mongo.Collection("activitiePersons");
ActivitiePersons.attachSchema(Schema.ActivityPerson);

GroupChatMessages = new Mongo.Collection("groupChatMessages");
GroupChatMessages.attachSchema(Schema.GroupChatMessage);

Users = Meteor.users;
Users.attachSchema(Schema.User);

Meets = new Mongo.Collection("meets");
Meets.attachSchema(Schema.Meet);

Friends = new Mongo.Collection("friends");
Friends.attachSchema(Schema.Friend);

Messages = new Mongo.Collection("messages");
Messages.attachSchema(Schema.Message);

//todo 方便在浏览器端操作数据测试完毕后删除
Messages.allow({
    insert: function() {
        return true;
    },

    remove: function() {
        return true;
    },

    update: function() {
        return true;
    }
});
Activities.allow({
    insert: function() {
        return true;
    },

    remove: function() {
        return true;
    },

    update: function() {
        return true;
    }
});