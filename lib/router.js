/*
Router.map(function() {
  this.route('adminMain', {
    path: Admin.basePath,
    template: 'adminDashboard',
    layoutTemplate: 'adminDefaultLayout',
    yieldTemplates: {
      'adminMenu': {to: 'menu'}
    }    
  });

  this.route('adminList', {
    path: Admin.basePath + '/:name',
    template: 'adminList',
    layoutTemplate: 'adminDefaultLayout',
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
    onBeforeAction: function() {
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
    layoutTemplate: 'adminDefaultLayout',
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
    onBeforeAction: function() {
      var collectionName = this.params.name;
      if (!Meteor.loggingIn() && !Admin._checkPermissions(Meteor.user(), collectionName, 'edit')) {
        this.stop();
        Router.go('/');
      }
    }
  });
});
*/