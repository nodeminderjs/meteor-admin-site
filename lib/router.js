Router.map(function() {
  this.route('adminMain', {
    path: Admin.basePath,
    template: 'adminDashboard',
    layoutTemplate: 'adminLayout',
    yieldTemplates: {
      'adminMenu': {to: 'menu'}
    },    
    before: function() {
      if (!Meteor.loggingIn() && !Admin._checkPermissions(Meteor.user())) {
        this.stop();
        Router.go('/');
      }
    }
  });

  this.route('adminList', {
    path: Admin.basePath + '/:name',
    template: 'adminList',
    layoutTemplate: 'adminLayout',
    yieldTemplates: {
      'adminMenu': {to: 'menu'}
    },
    data: function() {
      var collectionName = this.params.name;
      return Admin.getListTemplateData(collectionName);
    },
    waitOn: function () {
      var collectionName = this.params.name;
      return Meteor.subscribe('adminData', collectionName);
    },
    before: function() {
      var collectionName = this.params.name;
      if (!Meteor.loggingIn() && !Admin._checkPermissions(Meteor.user(), collectionName, 'list')) {
        this.stop();
        Router.go('/');
      }
    }
  });

  this.route('adminEdit', {
    path: Admin.basePath + '/:collectionName/edit/:_id',
    template: 'adminEdit',
    layoutTemplate: 'adminLayout',
    yieldTemplates: {
      'adminMenu': {to: 'menu'}
    },
    data: function() {
      var collectionName = this.params.collectionName,
          _id = this.params._id;
      return Admin.getEditTemplateData(collectionName, _id);
    },
    waitOn: function () {
      var collectionName = this.params.collectionName,
          _id = this.params._id;
      return Admin.subscribeEdit(collectionName, _id);
    },
    before: function() {
      var collectionName = this.params.name;
      if (!Meteor.loggingIn() && !Admin._checkPermissions(Meteor.user(), collectionName, 'edit')) {
        this.stop();
        Router.go('/');
      }
    }
  });
});

/*
// http://book.discovermeteor.com/chapter/creating-posts
// Securing Access To The New Post Form

var requireLogin = function() {
  if (! Meteor.user()) {
    if (Meteor.loggingIn())
      this.render(this.loadingTemplate);
    else
      this.render('accessDenied');
    this.stop();
  }
}
Router.before(requireLogin, {only: 'postSubmit'});
*/
