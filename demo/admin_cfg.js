Admin.startup(function() {
  Admin.basePath = '/admin-site';

  Admin.layout = 'adminLayout';

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
    customDisplayFields: {
      createdAt: function(dt) {
        return formatDateTime(dt);
      }
    },
    editFields: ['profile.name', 'profile.role', 'profile.addresses'],
    customEditFields: {
      'profile.role': {
        type: 'select',
        options: ['admin', 'staff', 'user']
      }
    },
    labels: {
      '_id': 'Id',
      'profile.name': 'Name',
      'profile.role': 'Role',
      'profile.addresses': 'Addresses',
      'createdAt': 'Created'
    },
    plugins: {
      'profile.addresses': AddressesPlugin
    }
  });
      
  Admin.set('Posts', {
    listFields: ['title', 'author', 'url', 'message', 'submitted', 'lastModified', 'commentsCount'],
    customDisplayFields: {
      submitted: function(dt) {
        return formatDateTime(dt);
      },
      lastModified: function(dt) {
        return formatDateTime(dt);
      },
      url: function(link, edit) {
        if (edit)
          return link;
        else
          return '<a href="' + link + '">' + link + '</a>';
      }
    },
    editFields: ['title', 'author', 'url', 'message', 'commentsCount'],
    customEditFields: {
      author: {
        type: 'reference',
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
    beforeSave: function(collectionName, editDoc, op) {
      // This code will run in the server, before insert/update the doc
      // op == 'update' || 'insert'
      var dt = new Date().getTime();
      editDoc['lastModified'] = dt;
      if (op == 'insert')
        editDoc['submitted'] = dt;
    }
  });

  Admin.set('Products', {
    filters: [
      {
        field: 'category',
        // From Meteor docs: If you return multiple cursors in an array, they
        //                   currently must all be from different collections.
        pubFind: function() {
          return Categories.find({}, {fields: {name: 1}, sort: {'name': 1}});
        },
        getValues: function() {
          return Categories.find({}, {fields: {name: 1}, sort: {'name': 1}}).map(function(c) {return c.name;});
        }
      }
    ],
    plugins: {
      category: {
        template: 'adminCategoryPlugin',
        getValue: function(field) {
          var value = $('#' + field).val();
          return value.split(',').sort();
        }
      }
    }
  });
});

/*
 * Plugins
 */

if (Meteor.isServer) {
  Meteor.publish('adminCategoryPlugin', function() {
    return Categories.find({}, {sort: {name: 1}});
  });  
}

if (Meteor.isClient) {
  Meteor.subscribe('adminCategoryPlugin');

  Template.adminCategoryPlugin.getCategories = function() {
    var categories = Categories.find({}, {sort: {name: 1}}).map(function(c) {return c.name;});
    //return JSON.stringify(['Belo Horizonte', 'Niterói', 'Nova Friburgo', 'Rio de Janeiro', 'São Paulo']);
    return JSON.stringify(categories);
  }
}

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
