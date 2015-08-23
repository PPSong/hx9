 Meteor.subscribe("meets");
 Meteor.subscribe("messages");

 Template.body.helpers({
     messages: function() {
         return Messages.find({});
     }
 });

 Template.body.events({
     "submit .ppForm": function(event) {
         // Prevent default browser form submit
         event.preventDefault();
         Meteor.loginWithPassword(event.target.username.value, event.target.password.value);

         // Clear form
         event.target.username.value = "";
         event.target.password.value = "";
     },
     "click .logout": function() {
         Meteor.logout();
     }
 });