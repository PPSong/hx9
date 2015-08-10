Schema = {};

//user schema
Schema.SelfSpecialInfo = new SimpleSchema({
    hair: {
        type: String,
        allowedValues: ['长(男)', '短(男)', '长(女)', '短(女)']
    },
    glasses: {
        type: String,
        allowedValues: ['带', '不带']

    },
    clothesType: {
        type: String,
        allowedValues: ['大衣(男)', '衬衫(男)', '大衣(女)', '衬衫(女)']

    },
    clothesColor: {
        type: String,
        allowedValues: ['黑(男)', '白(男)', '黑(女)', '白(女)']
    },
    clothesStyle: {
        type: String,
        allowedValues: ['纯色(男)', '条纹(男)', '纯色(女)', '条纹(女)']
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
    blackList:{
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
        allowedValues: ['长(男)', '短(男)', '长(女)', '短(女)']
    },
    glasses: {
        type: String,
        allowedValues: ['带', '不带']

    },
    clothesType: {
        type: String,
        allowedValues: ['大衣(男)', '衬衫(男)', '大衣(女)', '衬衫(女)']

    },
    clothesColor: {
        type: String,
        allowedValues: ['黑(男)', '白(男)', '黑(女)', '白(女)']
    },
    clothesStyle: {
        type: String,
        allowedValues: ['纯色(男)', '条纹(男)', '纯色(女)', '条纹(女)']
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