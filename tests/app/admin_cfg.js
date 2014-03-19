Meteor.startup(function() {
  Admin.checkPermissions(function(user, collection, op) {
    // op == 'list' | 'insert' | 'update' | 'delete'
    if (!user)
      return false;

    return (user.username == 'alberto');
  });
  
  Admin.set('Users', {
    collection: Meteor.users,
    listFields: ['_id', 'profile.name'],
    editFields: ['profile.name'],
    labels: {
      'profile.name': 'Name'
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
      title: 'Title',
      author: 'Author',
      userId: 'User',
      url: 'Link',
      message: 'Message',
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

