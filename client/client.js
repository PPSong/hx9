 Meteor.subscribe("meets");
 Meteor.subscribe("messages");

 Template.body.helpers({
     messages: function() {
         return Messages.find({});
     }
 });