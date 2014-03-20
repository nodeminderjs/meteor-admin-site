Meteor.users.deny({
  update: function(userId, doc) {
    // only allow posting if you are logged in
    return true;
  }
});