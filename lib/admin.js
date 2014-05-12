/*
 * Public API
 */
Admin = {
  basePath: '/admin',
  
  layout: 'adminDefaultLayout',
  
  startup: function(callback) {
    if (callback)
      callback();

    initRoutes();
    
    if (Meteor.isClient) {
      Deps.autorun(function() {
        if (Admin._initHandle.ready())  // A reactive data source
          Admin._init();
      });
    } else {
      Admin._init();
    }
  },

  _initOk: false,
  _initHandle: null,

  _dep: new Deps.Dependency,
  ready: function() {
    Admin._dep.depend();
    return Admin._initOk;
  },
  _setReady: function() {
    Admin._initOk = true;
    Admin._dep.changed();
  },
  
  _init: function() {
    Meteor.startup(function() {
      if (Meteor.isClient)
        Admin._clientGetAppCollections();
      else
        Admin._serverGetAppCollections();
      
      Admin._initCollections();

      if (Meteor.isClient) {
        Admin._initHandle.stop();

        // Create default session vars for filter, sort and limit each collection list
        Admin._collectionsArray.forEach(function(c) {
          Session.set('filter' + c.name, {});
          Session.set('sort' + c.name, []);
          Session.set('limit' + c.name, 5);
        });
      }
      
      // Sort collections array
      Admin._collectionsArray = Admin._collectionsArray.sort(function(a,b) { return a.name > b.name  });
      
      Admin._setReady();
    });
  },

  set: function(collectionName, keyobj, value) {
    // Ex.: Admin.set('Posts', 'listFields', [...]);
    //      Admin.set('Posts', {...});
    // ToDo: refactor this!
    var key, obj,
        collectionObj = Admin._collectionsObj[collectionName];
    
    if (typeof keyobj == 'string') {
      key = keyobj;
      obj = {};
      obj[key] = value;
    } else {
      obj = keyobj;
    }
    
    if (!collectionObj) {
      collectionObj = {name: collectionName};
      Admin._collectionsObj[collectionName] = collectionObj;
      Admin._collectionsArray.push(collectionObj);
    }
    for (key in obj)
      collectionObj[key] = obj[key];
  },
  
  getEditTemplateData: function(collectionName, _id) {
    var collectionObj = Admin._collectionsObj[collectionName];
    var doc = collectionObj.collection.findOne({_id: _id});

    return { 
      collectionName: collectionName,
      doc: doc,
      editFields: collectionObj.editFields
    };
  },

  subscribeEdit: function(collectionName, _id) {
    var collectionObj = Admin._collectionsObj[collectionName],
        pub = [ Meteor.subscribe('adminEdit', collectionName, _id) ];

    if (collectionObj.customEditFields) {
      pub.concat( Meteor.subscribe('adminRef', collectionName) );
    }
    
    return pub;
  },

  admRoutes: ['adminMain', 'adminList', 'adminEdit'],

  isAdminRoute: function() {
    return (Router.current() && Admin.admRoutes.indexOf(Router.current().route.name) > -1);  
  },
  
  checkPermissions: function(callback) {
    // callback == function(user, collection, op) { ... throw error or return true|false }
    // op == 'list' | 'insert' | 'update' | 'delete'
      Admin._checkPermissions = callback;
  },

  _checkPermissions: function(user, collection, op) {
    return true;
  },
  
  _collectionsArray: [],
  _collectionsObj: {},
  
  _initCollections: function() {
    var c, collectionObj, fields, dataTypes, doc;
    for (c in Admin._collectionsArray) {
      collectionObj = Admin._collectionsArray[c];
      fields = [];
      dataTypes = {};
      doc = collectionObj.collection.findOne();

      if (doc) {
        for (f in doc) {
          fields.push(f);
          getDataType(f, doc[f], dataTypes);
        }
      }
      if (!collectionObj.listFields)
        collectionObj.listFields = fields;
      if (!collectionObj.editFields)
        collectionObj.editFields = _.without(fields, '_id');
      else
        collectionObj.editFields = _.without(collectionObj.editFields, '_id');
      if (!collectionObj.dataTypes)
        collectionObj.dataTypes = dataTypes;
    }
  },
                                   
  _clientGetAppCollections: function() {
    // Go through all global objects to find the collections
    for (var globalObject in window) { 
      // This was giving a deprecated error message, so just checking for it explicitly
      if (globalObject === "webkitStorageInfo")
        continue;
      if (window[globalObject] instanceof Meteor.Collection)
        Admin._registerCollection(globalObject, window[globalObject]);
    }
  },

  _serverGetAppCollections: function() {
    var globals = Function('return this')();
    // Go through all global objects to find the collections
    for (var globalObject in globals) { 
      if (globals[globalObject] instanceof Meteor.Collection)
        Admin._registerCollection(globalObject, globals[globalObject]);
    }
  },

  _registerCollection: function(name, collection) {
    var collectionObj = Admin._collectionsObj[name];

    if (!collectionObj) {
      collectionObj = {
        name: name,
        collection: collection
      };

      // Push the collection object into the collections array and into the collections object for fast and simple seek
      Admin._collectionsArray.push(collectionObj);
      Admin._collectionsObj[name] = collectionObj;
    } else {
      if (!collectionObj.collection)
        collectionObj.collection = collection;
    }
  }
}

if (Meteor.isClient) {
  Admin._initHandle = Meteor.subscribe('adminInit');
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    /*
     * Publications
     */
    Meteor.publish('adminData', function(collectionName, filter, sort, limit) {
      var collectionObj = Admin._collectionsObj[collectionName],
          a = [];

      a.push( collectionObj.collection.find(filter, {sort: sort, limit: limit}) );
      
      // From Meteor docs: If you return multiple cursors in an array, they
      //                   currently must all be from different collections.
      if (collectionObj.filters) {
        for (var i in collectionObj.filters) {
          if (collectionObj.filters[i].pubFind) {
            a.push( collectionObj.filters[i].pubFind() )
          }
        }
      }
      
      return a;
    });

    Meteor.publish('adminEdit', function(collectionName, _id) {
      var collection = Admin._collectionsObj[collectionName].collection;
      return collection.find({_id: _id});
    });

    Meteor.publish('adminInit', function() {
      var a = [];
      for (var c in Admin._collectionsArray) {
        var collection = Admin._collectionsArray[c].collection;
        a.push(collection.find({}, {limit: 1}));
      }    
      return a;
    });
    
    Meteor.publish('adminRef', function(collectionName) {
      var collectionObj = Admin._collectionsObj[collectionName],
          pub = [],
          editObj, collection;

      // ToDo: move this to the Admin.subscribeEdit function to avoid
      // an error when we have two or more refs to the same collection
      if (collectionObj.customEditFields) {
        for (var field in collectionObj.customEditFields) {
          editObj = collectionObj.customEditFields[field];
          if (editObj.type == 'reference') {
            collection = Admin._collectionsObj[editObj.ref].collection;
            pub.push( editObj.get(collection) );
          }
        }
      }

      return pub;
    });
  });
}

/*
 * Meteor admin methods
 */
Meteor.methods({
  adminUpdate: function(collectionName, editDoc, _id) {
    var user = Meteor.user(),
        collectionObj = Admin._collectionsObj[collectionName],
        customEditFields = collectionObj.customEditFields,
        refObj, refCollection, refDoc, doc;

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to login to write admin data");
    
    // ensure the user has the required permissions to exec the operation
    doc = collectionObj.collection.findOne(_id);
    if (!Admin._checkPermissions(user, collectionObj.name, 'update', doc, editDoc))
      throw new Meteor.Error(401, "You don't have the permissions to update " + collectionObj.name);

    // process references
    if (customEditFields) {
      for (var field in customEditFields) {
        refObj = customEditFields[field];
        if (refObj.type == 'reference') {
          refCollection = Admin._collectionsObj[refObj.ref].collection;
          refDoc = refObj.lkp(refCollection, editDoc[field]);
          refObj.set(editDoc, refDoc);
        }
      }
    }
    
    // beforeSave event
    if (collectionObj.beforeSave)
      collectionObj.beforeSave(collectionName, editDoc, 'update');
    
    var count = collectionObj.collection.update({_id: _id}, {$set: editDoc});

    return count;
  }
});

/*
 * Helper functions
 */
function getDataType(field, value, object) {
  switch(typeof value) {
    case 'number':
      object[field] = 'number';
      break;
    case 'boolean':
      object[field] = 'boolean';
      break;
  }
}

/*
 * Init routes
 */
Router.configure({
  onBeforeAction: function(pause) {
    if (!Admin.ready()) {
      pause();
      this.render('adminLoading');
    }
  }
});

function initRoutes() {
  Router.map(function() {
    this.route('adminMain', {
      path: Admin.basePath,
      template: 'adminDashboard',
      layoutTemplate: Admin.layout,
      yieldTemplates: {
        'adminMenu': {to: 'menu'}
      }    
    });

    this.route('adminList', {
      path: Admin.basePath + '/:name',
      template: 'adminList',
      layoutTemplate: Admin.layout,
      yieldTemplates: {
        'adminMenu': {to: 'menu'}
      },
      data: function() {
        var collectionName = this.params.name,
            collectionObj = Admin._collectionsObj[collectionName],
            filter, docs, count;
        if (collectionObj.filters) {
          for (var i in collectionObj.filters) {
            filter = collectionObj.filters[i];
            if (filter.getValues) {
              filter.values = filter.getValues();
            }
          }
        }
        docs = collectionObj.collection.find(Session.get('filter' + collectionName),
                  {sort: Session.get('sort' + collectionName), limit: Session.get('limit' + collectionName)});
        count = docs.count();
        return {
          collectionName: collectionName,
          docs: docs,
          listFields: collectionObj.listFields,
          filters: collectionObj.filters,
          count: count,
          nfields: collectionObj.listFields.length
        };
      },
      waitOn: function () {
        var collectionName = this.params.name;
        return Meteor.subscribe('adminData', collectionName,
                                Session.get('filter' + collectionName),
                                Session.get('sort' + collectionName),
                                Session.get('limit' + collectionName));
      },
      action: function() {
        var collectionName = this.params.name;
        if (!Meteor.loggingIn() && !Admin._checkPermissions(Meteor.user(), collectionName, 'list')) {
          this.redirect('/');
          return;
        }
        this.render();
      }
    });

    this.route('adminEdit', {
      path: Admin.basePath + '/:collectionName/edit/:_id',
      template: 'adminEdit',
      layoutTemplate: Admin.layout,
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
}
