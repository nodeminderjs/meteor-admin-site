Package.describe({
  summary: "A Meteor admin tool loosely inspired by the Django admin site"
});

Package.on_use(function(api) {
  api.use('minimongo', 'client');
  api.use('mongo-livedata', 'client');
  api.use('templating', 'client');
  api.use('iron-router', ['client', 'server']);

  api.export('Admin');

  api.add_files('lib/admin.js', ['client', 'server']);
  api.add_files(['lib/main.html', 'lib/main.js', 'lib/main.css'], 'client');
  api.add_files('lib/router.js', ['client', 'server']);
});

/*
Package.on_test(function(api) {
  api.use('errors', 'client');
  api.use(['tinytest', 'test-helpers'], 'client');  

  api.add_files('errors_tests.js', 'client');
});
*/
