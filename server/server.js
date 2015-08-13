 Meteor.startup(function() {
     // code to run on server at startup
     SyncedCron.add({
         name: 'Crunch some important numbers for the marketing department',
         schedule: function(parser) {
             // parser is a later.parse object
             return parser.text('every 5 seconds');
         },
         job: function() {
             //把超时的待回复/待确认meet设置为失败
             var tmpNow = new Date();
             Meets.update({
                 status: {
                     $in: ['待回复', '待确认']
                 },
                 $and: [{
                     createdTime: {
                         $lt: moment(tmpNow).add(-3, 'minutes').toDate()
                     }
                 }, {
                     createdTime: {
                         $gt: moment(tmpNow).add(-4, 'minutes').toDate()
                     }
                 }]
             }, {
                 $set: {
                     status: '失败'
                 }
             }, {
                 multi: true
             });
         }
     });
     //SyncedCron.start();
 });

 Meteor.publish("meets", function() {
     if (this.userId) {
         return Meets.find({
             $or: [{
                 createrUserId: this.userId
             }, {
                 targetUserId: this.userId
             }]
         });
     } else {
         return null;
     }
 });

 Meteor.publish("messages", function() {
     if (this.userId) {
         return Messages.find({
             $or: [{
                 fromUserId: this.userId
             }, {
                 toUserId: this.userId
             }]
         });
     } else {
         return null;
     }
 });

 Meteor.publish("friends", function() {
     if (this.userId) {
         return Friends.find({
             $or: [{
                 userId1: this.userId
             }, {
                 userId2: this.userId
             }]
         });
     } else {
         return null;
     }
 });

 var _sendMeetCheck = function(curUser) {
     var tmpNow = moment();
     var createMeetInterval = -5;

     if (curUser) {
         if (!(curUser.profile.lastLocation && curUser.profile.specialInfoTime && moment(curUser.profile.specialInfoTime).valueOf() > moment(tmpNow).startOf('day').valueOf())) {
             return '请更新特征信息!';
         } else if (curUser.profile.lastMeetCreateTime && moment(curUser.profile.lastMeetCreateTime).valueOf() > moment(tmpNow).add(createMeetInterval, 's').valueOf()) {
             var leftTime = moment(curUser.profile.lastMeetCreateTime).diff(moment(tmpNow).add(createMeetInterval, 's'), 's', true);
             return '距离允许发送新邀请还有:' + leftTime + '秒';
         } else {
             return "ppok";
         }
     } else {
         return "请先登录!";
     }
 }

 var _createFriend = function(userId1, userId2) {
     var user1 = Users.findOne(userId1);
     var user2 = Users.findOne(userId2);
     if (user1 && user2) {
         Friends.insert({
             userId1: userId1,
             username1: user1.username,
             nickname1: user1.profile.nickname,
             friendLogo1: (user1.profile.specialInfo && user1.profile.specialInfo.specialPic) || 'img/x.png',
             userId2: userId2,
             username2: user2.username,
             nickname2: user2.profile.nickname,
             friendLogo2: (user2.profile.specialInfo && user2.profile.specialInfo.specialPic) || 'img/x.png'
         });
         //发送初始消息
         Messages.insert({
             fromUserId: userId2,
             toUserId: userId1,
             content: "开约咯!",
             unread: true
         });
         Messages.insert({
             fromUserId: userId1,
             toUserId: userId2,
             content: "开约咯!",
             unread: true
         });
         return "ppok";
     } else {
         throw new Meteor.Error("没有对应用户!");
     }
 }

 Meteor.methods({
     register: function(username, password, sex, nickname) {
         return Accounts.createUser({
             username: username,
             password: password,
             profile: {
                 sex: sex,
                 nickname: nickname
             }
         });
     },
     test: function(lastLocation) {
         Users.update(Meteor.userId(), {
             $set: {
                 "profile.lastLocation": lastLocation,
                 "profile.lastLocationTime": new Date(),
             }
         });
         return "abc";
     },
     saveSpecialInfoAndPosition: function(editingSpecialInfo, lastLocation) {
         var self = this;
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         try {
             Users.update(Meteor.userId(), {
                 $set: {
                     "profile.specialInfo": editingSpecialInfo,
                     "profile.specialInfoTime": new Date(),
                     "profile.lastLocation": lastLocation,
                     "profile.lastLocationTime": new Date(),
                     "profile.needUpdateSpecialInfoCount": 0
                 }
             });

             //为防止curUser更新延迟, 顾放到这里Users.update之后
             var curUser = Meteor.user();
             //通知附近有发送待确认meet中条件匹配的创建者
             var tmpMeets = Meets.aggregate(
                 [{
                     $geoNear: {
                         near: {
                             type: "Point",
                             coordinates: curUser.profile.lastLocation
                         },
                         distanceField: "personLoc",
                         maxDistance: 500,
                         query: {
                             "specialInfo.sex": curUser.profile.sex,
                             "createrUseId": {
                                 $ne: curUser.username
                             }
                         },
                         spherical: true
                     }
                 }, {
                     $project: {
                         score: {
                             $add: [{
                                 $cond: [{
                                         $eq: ["$specialInfo.hair", editingSpecialInfo.hair]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$specialInfo.glasses", editingSpecialInfo.glasses]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$specialInfo.clothesType", editingSpecialInfo.clothesType]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$specialInfo.clothesColor", editingSpecialInfo.clothesColor]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$specialInfo.clothesStyle", editingSpecialInfo.clothesStyle]
                                     },
                                     1,
                                     0
                                 ]
                             }]
                         }
                     }
                 }, {
                     $match: {
                         score: {
                             $gte: 4
                         }
                     }
                 }]
             );

             var tmpMeetsArray = tmpMeets.map(function(item) {
                 return item._id;
             })

             //处理newMatchCount
             Meets.update({
                 _id: {
                     $in: tmpMeetsArray
                 }
             }, {
                 $inc: {
                     newMatchCount: 1
                 }
             }, {
                 multi: true
             });

             return "ppok";
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     sendMeetCheck: function() {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         try {
             var r = _sendMeetCheck(curUser);
             if (r != 'ppok') {
                 throw new Meteor.Error(r);
             } else {
                 return r;
             }
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     createNeedConfirm: function(targetSpecialInfoData) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         var r = _sendMeetCheck(curUser);
         if (r != 'ppok') {
             throw new Meteor.Error(r);
         }

         var tmpNow = new Date();
         if (!(targetSpecialInfoData && targetSpecialInfoData.place && targetSpecialInfoData.sex && targetSpecialInfoData.hair && targetSpecialInfoData.glasses && targetSpecialInfoData.clothesType && targetSpecialInfoData.clothesColor && targetSpecialInfoData.clothesStyle)) {
             throw new Meteor.Error("缺少必填项!");
         }

         try {
             //设置lastMeetCreateTime
             Users.update(self.userId, {
                 $set: {
                     "profile.lastMeetCreateTime": tmpNow
                 }
             });
             //建立meet
             Meets.insert({
                 createrUserId: self.userId,
                 createrUsername: curUser.username,
                 createrNickname: curUser.profile.nickname,
                 createrSpecialPic: curUser.profile.specialInfo.specialPic,
                 targetUnread: true,
                 createTime: tmpNow,
                 status: '待确认',
                 newMatchNum: 0,
                 replyLeft: 2,
                 personLoc: [curUser.profile.lastLocation[0], curUser.profile.lastLocation[1]],
                 specialInfo: targetSpecialInfoData
             });

             //通知附近500米内没有specialInfo的人
             Users.update({
                 "profile.lastLocation": {
                     $near: {
                         $geometry: {
                             type: "Point",
                             coordinates: curUser.profile.lastLocation
                         },
                         $minDistance: 0,
                         $maxDistance: 500
                     }
                 },
                 "profile.sex": targetSpecialInfoData.sex,
                 _id: {
                     $ne: self.userId
                 },
                 $or: [{
                     "profile.specialInfoTime": {
                         $exists: false
                     }
                 }, {
                     "profile.specialInfoTime": {
                         $lt: moment().startOf('day').toDate()
                     }
                 }]
             }, {
                 $inc: {
                     "profile.needUpdateSpecialInfoCount": 1
                 }
             }, {
                 multi: true
             });

             return "ppok";
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     createMeetChooseTarget: function(targetUserId, targetSpecialInfoData) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         var r = _sendMeetCheck(curUser);
         if (r != 'ppok') {
             throw new Meteor.Error(r);
         }

         var tmpNow = new Date();

         //目标不能为本人
         if (self.userId == targetUserId) {
             throw new Meteor.Error("目标不能为本人!");
         }

         var target = Users.findOne(targetUserId);
         if (target == null) {
             throw new Meteor.Error("没找到对应用户!");
         }

         try {
             //确定不在黑名单中
             var tmpV0 = Users.findOne({
                 _id: self.userId,
                 "profile.blackList": targetUserId
             });
             if (tmpV0 != null) {
                 throw new Meteor.Error("此人在你黑名单中!");
             }

             //确定不是本人发送待回复的meet中的目标
             var tmpV1 = Meets.findOne({
                 createrUserId: self.userId,
                 targetUserId: targetUserId,
                 status: '待回复'
             });
             if (tmpV1 != null) {
                 throw new Meteor.Error("已对此人发过邀请!");
             }

             //确定不是本人朋友
             var tmpV2 = Friends.findOne({
                 $or: [{
                     '$and': [{
                         userId1: self.userId
                     }, {
                         userId2: targetUserId
                     }]
                 }, {
                     '$and': [{
                         userId2: self.userId
                     }, {
                         userId1: targetUserId
                     }]
                 }]
             });
             if (tmpV2 != null) {
                 throw new Meteor.Error("此人已是你好友!");
             }

             //判断是否互发
             var tmpV3 = Meets.findOne({
                 createrUserId: targetUserId,
                 targetUserId: self.userId,
                 status: "待回复"
             });

             if (tmpV3 != null) {
                 //是互发
                 //修改对方创建meet为成功
                 Meets.update(tmpV3._id, {
                     $set: {
                         status: "成功"
                     }
                 })
                 return _createFriend(targetUserId, self.userId);
             }

             //不是互发
             //更新最近发送meet时间,清空最近选择fake时间
             Users.update(self.userId, {
                 $set: {
                     "profile.lastMeetCreateTime": tmpNow,
                     "profile.lastFakeTime": null
                 }
             });

             //创建meet
             Meets.insert({
                 createrUserId: self.userId,
                 createrUsername: curUser.username,
                 createrNickname: curUser.profile.nickname,
                 createrSpecialPic: curUser.profile.specialInfo.specialPic,
                 targetUserId: target._id,
                 targetUsername: target.username,
                 targetNickname: target.profile.nickname,
                 targetSpecialPic: target.profile.specialInfo.specialPic,
                 targetUnread: true,
                 createTime: tmpNow,
                 status: '待回复',
                 personLoc: [curUser.profile.lastLocation[0], curUser.profile.lastLocation[1]],
                 specialInfo: targetSpecialInfoData
             });
             return "ppok";
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }

     },
     confirmMeetChooseTarget: function(meetId, targetUserId) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(meetId && targetUserId)) {
             throw new Meteor.Error("缺少必填项!");
         }

         try {
             //确定不在黑名单中
             var tmpV0 = Users.findOne({
                 _id: self.userId,
                 "profile.blackList": targetUserId
             });
             if (tmpV0 != null) {
                 throw new Meteor.Error("此人在你黑名单中!");
             }

             //确定是本人创建的meet
             var tmpMeet = Meets.findOne(meetId);
             if (!tmpMeet) {
                 throw new Meteor.Error("没找到对应meet!");
             }
             if (tmpMeet.createrUserId != self.userId) {
                 throw new Meteor.Error("只能确认自己创建的meet!");
             }

             //目标不能为本人
             if (self.userId == targetUserId) {
                 throw new Meteor.Error("目标不能为本人!");
             }

             var target = Users.findOne(targetUserId);
             if (target == null) {
                 throw new Meteor.Error("没找到对应用户!");
             }

             var tmpNow = new Date();

             //确定不是本人发送待回复的meet中的目标
             var tmpV1 = Meets.findOne({
                 createrUserId: self.userId,
                 targetUserId: targetUserId,
                 status: '待回复'
             });
             if (tmpV1 != null) {
                 throw new Meteor.Error("已对此人发过邀请!");
             }

             //确定不是本人朋友
             var tmpV2 = Friends.findOne({
                 $or: [{
                     '$and': [{
                         userId1: self.userId
                     }, {
                         userId2: targetUserId
                     }]
                 }, {
                     '$and': [{
                         userId2: self.userId
                     }, {
                         userId1: targetUserId
                     }]
                 }]
             });
             if (tmpV2 != null) {
                 throw new Meteor.Error("此人已是你好友!");
             }

             //判断targetUser是否存在
             var targetUser = Users.findOne(targetUserId);
             if (targetUser == null) {
                 throw new Meteor.Error("没找到对应用户!");
             }

             //判断是否互发
             var tmpV3 = Meets.findOne({
                 createrUserId: targetUserId,
                 targetUserId: self.userId,
                 status: "待回复"
             });

             if (tmpV3 != null) {
                 //是互发
                 //更新自己创建的待确认meet为成功
                 Meets.update(meetId, {
                     $set: {
                         targetUserId: targetUser._id,
                         targetUsername: targetUser.username,
                         targetNickname: targetUser.profile.nickname,
                         targetSpecialPic: targetUser.profile.specialInfo.specialPic,
                         status: '成功',
                         successTime: new Date()
                     }
                 });

                 //修改对方创建meet为成功
                 Meets.update(tmpV3._id, {
                     $set: {
                         status: "成功"
                     }
                 });

                 //生成朋友
                 return _createFriend(targetUserId, self.userId);
             }

             //不是互发
             if (!(curUser.profile.specialInfoTime && curUser.profile.specialInfoTime >= moment(tmpNow).startOf('day').toDate())) {
                 throw new Meteor.Error("请更新特征信息!");
             }

             //确认meet
             Meets.update(meetId, {
                 $set: {
                     targetUserId: targetUser._id,
                     targetUsername: targetUser.username,
                     targetNickname: targetUser.profile.nickname,
                     targetSpecialPic: targetUser.profile.specialInfo.specialPic,
                     targetUnread: true,
                     confirmTime: tmpNow,
                     status: '待回复'
                 }
             });
             return "ppok";
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     createMeetSearchTarget: function(targetSpecialInfoData) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(targetSpecialInfoData && targetSpecialInfoData.place && targetSpecialInfoData.sex && targetSpecialInfoData.hair && targetSpecialInfoData.glasses && targetSpecialInfoData.clothesType && targetSpecialInfoData.clothesColor && targetSpecialInfoData.clothesStyle)) {
             throw new Meteor.Error("缺少必填项!");
         }

         try {
             //找本人发送待回复的meet中的目标
             var targets1 = Meets.find({
                 'createrUserId': self.userId,
                 'status': '待回复'
             }, {
                 fields: {
                     _id: 0,
                     targetUserId: 1
                 }
             }).fetch().map(function(item) {
                 return item.targetUserId;
             });

             //找本人朋友
             var targets2 = Friends.find({
                 $or: [{
                     userId1: self.userId
                 }, {
                     userId2: self.userId
                 }]
             }, {
                 fields: {
                     _id: 0,
                     userId1: 1,
                     userId2: 1
                 }
             }).fetch().map(function(item) {
                 return (item.userId1 == self.userId ? item.userId2 : item.userId1);
             });
             var results = Users.aggregate(
                 [{
                     $geoNear: {
                         near: {
                             type: "Point",
                             coordinates: [curUser.profile.lastLocation[0], curUser.profile.lastLocation[1]]
                         },
                         distanceField: "lastLocation",
                         maxDistance: 500,
                         query: {
                             "profile.specialInfoTime": {
                                 $gt: new Date(moment()
                                     .startOf('day').valueOf())
                             },
                             "profile.lastLocationTime": {
                                 $gt: new Date(moment()
                                     .add(-1, 'd').valueOf())
                             },
                             "profile.sex": targetSpecialInfoData.sex,
                             _id: {
                                 $ne: self.userId,
                                 $nin: targets1.concat(targets2).concat(curUser.profile.blackList)
                             }
                         },
                         spherical: true
                     }
                 }, {
                     $project: {
                         _id: 1,
                         specialPic: "$profile.specialInfo.specialPic",
                         score: {
                             $add: [{
                                 $cond: [{
                                         $eq: ["$profile.specialInfo.hair", targetSpecialInfoData.hair]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$profile.specialInfo.glasses", targetSpecialInfoData.glasses]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$profile.specialInfo.clothesType", targetSpecialInfoData.clothesType]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$profile.specialInfo.clothesColor", targetSpecialInfoData.clothesColor]
                                     },
                                     1,
                                     0
                                 ]
                             }, {
                                 $cond: [{
                                         $eq: ["$profile.specialInfo.clothesStyle", targetSpecialInfoData.clothesStyle]
                                     },
                                     1,
                                     0
                                 ]
                             }]
                         }
                     }
                 }, {
                     $match: {
                         score: {
                             $gte: 4
                         }
                     }
                 }]
             );
             return results;
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     replyMeetSearchTarget: function(meetId, targetSpecialInfoData) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(meetId && targetSpecialInfoData && targetSpecialInfoData.sex && targetSpecialInfoData.hair && targetSpecialInfoData.glasses && targetSpecialInfoData.clothesType && targetSpecialInfoData.clothesColor && targetSpecialInfoData.clothesStyle)) {
             throw new Meteor.Error("缺少必填项!");
         }

         try {
             //确定是目标为自己的meet
             //pptodo: 其实还要确定是否这个meet的状态是属于可被reply的状态, 以及查询和写入数据的时间差
             var tmpMeet = Meets.findOne(meetId);
             if (!tmpMeet) {
                 throw new Meteor.Error("没找到对应meet!");
             }
             if (tmpMeet.targetUserId != self.userId) {
                 throw new Meteor.Error("只能回复发给自己的meet!");
             }
             if (tmpMeet.replyLeft <= 0) {
                 throw new Meteor.Error("没有回复次数!");
             } else {
                 if (tmpMeet.replyLeft == 1) {
                     Meets.update(meetId, {
                         $set: {
                             replyLeft: 0,
                             status: '失败'
                         }
                     });
                 } else {
                     Meets.update(meetId, {
                         $inc: {
                             replyLeft: -1
                         }
                     });
                 }
             }

             //看meet creater中的特征信息和提供的回复特征信息是否匹配
             var tmpCreater = Users.findOne(tmpMeet.createrUserId);
             var score = 0;
             if (tmpCreater.profile.specialInfo.hair == targetSpecialInfoData.hair) {
                 score++;
             }
             if (tmpCreater.profile.specialInfo.glasses == targetSpecialInfoData.glasses) {
                 score++;
             }
             if (tmpCreater.profile.specialInfo.clothesType == targetSpecialInfoData.clothesType) {
                 score++;
             }
             if (tmpCreater.profile.specialInfo.clothesColor == targetSpecialInfoData.clothesColor) {
                 score++;
             }
             if (tmpCreater.profile.specialInfo.clothesStyle == targetSpecialInfoData.clothesStyle) {
                 score++;
             }
             if (tmpCreater.profile.sex != targetSpecialInfoData.sex) {
                 score = 0;
             }
             if (score < 4) {
                 throw new Meteor.Error("特征信息不匹配!");
             }

             //找到creater的SpecialPic, 并加上3张fake图片
             else {
                 var tmpResult = [{
                     userId: tmpCreater._id,
                     specialPic: tmpCreater.profile.specialInfo.specialPic
                 }];
                 for (var i = 0; i < 4; i++) {
                     tmpResult.push({
                         userId: "fake",
                         specialPic: "data:image/png;base64,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"
                     });
                 }
                 return tmpResult;
             }
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }

     },
     selectFake: function() {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         var tmpNow = new Date();
         try {
             //确定此用户是否是30s内有点击fake
             if (curUser.profile.lastFakeTime > moment(tmpNow).add(-30, 's').toDate()) {
                 //如果是则把meet最后发送时间改为now
                 Users.update(self.userId, {
                     $set: {
                         "profile.lastMeetCreateTime": tmpNow,
                         "profile.lastFakeTime": undefined
                     }
                 });
             } else {
                 Users.update(self.userId, {
                     $set: {
                         "profile.lastFakeTime": tmpNow
                     }
                 });
             }
             return 'ppok';
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     replyMeetClickTarget: function(meetId, createrUserId) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(meetId && createrUserId)) {
             throw new Meteor.Error("缺少必填项!");
         }

         var tmpNow = new Date();
         try {
             //确定是目标为自己的meet
             var tmpMeet = Meets.findOne(meetId);
             if (!tmpMeet) {
                 throw new Meteor.Error("没找到对应meet!");
             }
             if (tmpMeet.targetUserId != self.userId) {
                 throw new Meteor.Error("只能回复发给自己的meet!");
             }
             if (tmpMeet.createrUserId != createrUserId) {
                 throw new Meteor.Error("没有选对目标!");
             }

             Meets.update(meetId, {
                 $set: {
                     status: "成功"
                 }
             });

             _createFriend(createrUserId, self.userId);

         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     sendMessage: function(message, toUserId) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(message && toUserId)) {
             throw new Meteor.Error("缺少必填项!");
         }

         var tmpNow = new Date();
         try {
             //如果toUserId不在本人的好友列表不能发送消息
             var tmpFriendShip = Friends.findOne({
					 $or: [{
					 '$and': [{
						 userId1: self.userId
					 }, {
						 userId2: toUserId
					 }]
				 }, {
					 '$and': [{
						 userId2: self.userId
					 }, {
						 userId1: toUserId
					 }]
				 }]
             });
             if (tmpFriendShip == null)
             {
             	throw new Meteor.Error("对方不是你好友!");
             }

             Messages.insert({
                 fromUserId: self.userId,
                 toUserId: toUserId,
                 content: message
             });
             return "ppok";
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     readMessage: function(friendUserId) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!friendUserId) {
             throw new Meteor.Error("缺少必填项!");
         }
         try {
             Messages.update({
                 fromUserId: friendUserId,
                 toUserId: self.userId,
                 unread: true
             }, {
                 $set: {
                     unread: false
                 }
             }, {
                 multi: true
             });
             return "ppok";
         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     clearNewMatchCount: function(meetId) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(meetId)) {
             throw new Meteor.Error("缺少必填项!");
         }

         try {
             //确定是自己创建的meet
             var tmpMeet = Meets.findOne(meetId);
             if (!tmpMeet) {
                 throw new Meteor.Error("没找到对应meet!");
             }
             if (tmpMeet.createrUserId != self.userId) {
                 throw new Meteor.Error("只能编辑自己创建的meet!");
             }

             Meets.update(meetId, {
                 $set: {
                     newMatchCount: 0
                 }
             });
             return "ppok";

         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     deleteFriend: function(friendId) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(friendId)) {
             throw new Meteor.Error("缺少必填项!");
         }

         try {
             //确定是自己相关的Friend
             var tmpFriend = Friends.findOne(friendId);
             if (!tmpFriend) {
                 throw new Meteor.Error("没找到对应friend!");
             }

             var targetUserId;
             if (tmpFriend.userId1 != self.userId && tmpFriend.userId2 != self.userId) {
                 throw new Meteor.Error("只能删除自己相关的friend!");
             } else {
                 targetUserId = (tmpFriend.userId1 == self.userId ? tmpFriend.userId2 : tmpFriend.userId1);
             }

             Friends.remove(friendId);
             //清除相关meet
             Meets.remove({
                 $or: [{
                     '$and': [{
                         createrUserId: self.userId
                     }, {
                         targetUserId: targetUserId
                     }]
                 }, {
                     '$and': [{
                         targetUserId: self.userId
                     }, {
                         createrUserId: targetUserId
                     }]
                 }],
                 status: {
                     $ne: '成功'
                 }
             });

             //清除相关message
             Messages.remove({
                 $or: [{
                     '$and': [{
                         fromUserId: self.userId
                     }, {
                         toUserId: targetUserId
                     }]
                 }, {
                     '$and': [{
                         toUserId: self.userId
                     }, {
                         fromUserId: targetUserId
                     }]
                 }]
             });

             //加入黑名单
             Users.update(
                 self.userId, {
                     $addToSet: {
                         "profile.blackList": targetUserId
                     }
                 }
             )
             return "ppok";

         } catch (e) {
             console.log(e);
             throw new Meteor.Error(e + "(500)", e.sanitizedError, e.invalidKeys);
         }
     },
     addFriend: function(friendUsername) {
         var self = this;
         var curUser = Meteor.user();
         if (!self.userId) {
             throw new Meteor.Error("请先登录!");
         }

         if (!(friendUsername)) {
             throw new Meteor.Error("缺少必填项!");
         }

         //确定不是自己
         if (friendUsername == curUser.username) {
             throw new Meteor.Error("不能添加自己为好友!");
         }

         var tmpFriend = Users.findOne({
             username: friendUsername
         });
         //确定friendUsername存在
         if (!tmpFriend) {
             throw new Meteor.Error("指定用户不存在!");
         }

         //确定friendUsername不是现有好友
         var tmpV1 = Friends.findOne({
             $or: [{
                 '$and': [{
                     userId1: self.userId
                 }, {
                     userId2: tmpFriend._id
                 }]
             }, {
                 '$and': [{
                     userId2: self.userId
                 }, {
                     userId1: tmpFriend._id
                 }]
             }]
         });
         if (tmpV1 != null) {
             throw new Meteor.Error("此人已是你好友!");
         }

         //确定friendUsername不在进行meet中
         var tmpV2 = Meets.findOne({
             $or: [{
                 '$and': [{
                     createrUserId: self.userId
                 }, {
                     targetUserId: tmpFriend._id
                 }]
             }, {
                 '$and': [{
                     targetUserId: self.userId
                 }, {
                     createrUserId: tmpFriend._id
                 }]
             }]
         });
         if (tmpV2 != null) {
             throw new Meteor.Error("此人正在和你meet中!");
         }

         //确定friendUsername不在黑名单中
         var tmpV3 = Users.findOne({
             _id: self.userId,
             "profile.blackList": tmpFriend._id
         });
         if (tmpV3 != null) {
             throw new Meteor.Error("此人在你黑名单中!");
         }

         //可以加为好友
         return _createFriend(self.userId, tmpFriend._id);
     }

 });