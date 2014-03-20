Template.header.helpers({
  canAdmin: function() {
    return (Meteor.user() && Meteor.user().profile.role != 'user');
  }
});