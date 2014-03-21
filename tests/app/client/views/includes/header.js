Template.header.helpers({
  canAdmin: function() {
    return (Meteor.user() && Meteor.user().profile.role != 'user');
  },
  adminRoute: function() {
    var basePath = Admin.basePath;
    
  }
});