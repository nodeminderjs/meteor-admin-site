Meteor.startup(function() {
  Admin.setBasePath('/admin-site');

  Admin.setLayout('adminLayout');

  Admin.checkPermissions(function(user, collection, op, doc, newDoc) {
    //
    // op == 'list' | 'new' | 'edit' | 'insert' | 'update' | 'delete'
    //
    var origin;

    if (Meteor.isClient)
      origin = window.location.origin;
    else
      origin = process.env.ROOT_URL;
        
    if (origin == 'http://admin-site.meteor.com') {
      if (op == 'update' && collection == 'Users' && doc.username == 'admin')
        throw new Meteor.Error(401, "You can't update the admin user");
    }

    return (user && user.profile.role != 'user');
  });

  Admin.set('Users', {
    collection: Meteor.users,
    listFields: ['_id', 'profile.name', 'username', 'profile.role', 'createdAt'],
    editFields: ['profile.name', 'profile.role'],
    selectFields: {
      'profile.role': {
        options: ['admin', 'staff', 'user']
      }
    },
    labels: {
      '_id': 'Id',
      'profile.name': 'Name',
      'profile.role': 'Role',
      'createdAt': 'Created'
    },
    customFields: {
      createdAt: function(dt) {
        return formatDateTime(dt);
      }
    }
  });
      
  Admin.set('Posts', {
    listFields: ['title', 'author', 'url', 'message', 'submitted', 'lastModified', 'commentsCount'],
    editFields: ['title', 'author', 'url', 'message', 'submitted', 'lastModified', 'commentsCount'],
    dataTypes: {
      submitted: 'number',
      lastModified: 'number',
      commentsCount: 'number'
    },
    labels: {
      userId: 'User',
      url: 'Link',
      submitted: 'Created',
      lastModified: 'Modified',
      commentsCount: 'Comments'
    },
    customFields: {
      submitted: function(dt) {
        return formatDateTime(dt);
      },
      lastModified: function(dt) {
        return formatDateTime(dt);
      },
      url: function(link) {
        return '<a href="' + link + '">' + link + '</a>';
      }
    },
    references: {
      author: {
        ref: 'Users',
        get: function(collection) {
          return collection.find({}, {fields: {_id: 1, profile: 1}, sort: {'profile.name': 1}});
        },
        map: function(d) {
          return d.profile.name;
        },
        lkp: function(collection, value) {
          return collection.findOne({'profile.name': value});
        },
        set: function(doc, ref) {
          doc.userId = ref._id;
          doc.author = ref.profile.name;
        }
      }
    },
    beforeSave: function(collectionName, editDoc, op) {
      // This code will run in the server, before insert/update the doc
      // op == 'update' || 'insert'
      var dt = new Date().getTime();
      editDoc['lastModified'] = dt;
      if (op == 'insert')
        editDoc['submitted'] = dt;
    }
  });
});

/*
 * Helper functions
 */

function pad(s) {
  return (s < 10) ? '0' + s : s;
}

function formatDateTime(d) {
  if (!d)
    return '';
  if (typeof d == 'number')
    d = new Date(d);
  return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/') + ' ' +
         [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
}
