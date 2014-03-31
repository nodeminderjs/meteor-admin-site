/*
 * Public API
 */
Admin = {
  basePath: '/admin',
  
  admRoutes: ['adminMain', 'adminList', 'adminEdit'],

  setBasePath: function(path) {
    for (var r = 0; r < Router.routes.length; r++) {
      var route = Router.routes[r];
      if (Admin.admRoutes.indexOf(route.name) > -1) {
        route.originalPath = route.originalPath.replace(Admin.basePath, path);
        route.options.path = route.options.path.replace(Admin.basePath, path);
        route.compile();
      }
    }
    Admin.basePath = path;
  },

  setLayout: function(layout) {
    for (var r in Router.routes) {
      var route = Router.routes[r];
      if (Admin.admRoutes.indexOf(route.name) > -1) {
        route.options.layoutTemplate = layout;
      }
    }
  },
  
  isAdminRoute: function() {
    return (Router.current() && Admin.admRoutes.indexOf(Router.current().route.name) > -1);  
  },

  set: function(collectionName, keyobj, value) {
    // Ex.: Admin.set('Posts', 'listFields', [...]);
    //      Admin.set('Posts', {...});
    var key, obj;
    
    if (typeof keyobj == 'string') {
      key = keyobj;
      obj = {};
      obj[key] = value;
    } else {
      obj = keyobj;
    }
    
    if (!Admin._initFlag) {
      var setObj = {};
      setObj['collectionName'] = collectionName;
      setObj['object'] = obj;
      Admin._initQueue.push(setObj);
      if (!Admin._initingFlag)
        Admin._init();
    } else {
      var collectionObj = Admin._collectionsObj[collectionName];
      if (!collectionObj) {
        collectionObj = {name: collectionName};
        Admin._collectionsObj[collectionName] = collectionObj;
        Admin._collectionsArray.push(collectionObj);
      }
      for (key in obj)
        collectionObj[key] = obj[key];
    }
  },
  
  getListTemplateData: function(collectionName) {
    var collectionObj = Admin._collectionsObj[collectionName];
    
    return {
      collectionName: collectionName,
      docs: collectionObj.collection.find(),
      listFields: collectionObj.listFields
    };
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
  
  _initFlag: false,
  _initingFlag: false,
  _initQueue: [],

  _init: function() {
    Admin._initingFlag = true;
    if (Meteor.isClient) {
      // Client initialization
      Admin._clientGetAppCollections();
      var handle = Meteor.subscribe('adminInit', function() {
        handle.stop();
        Admin._initCollections();
        Admin._initFlag = true;
        while (Admin._initQueue.length) {
          var setObj = Admin._initQueue.shift();
          Admin.set(setObj['collectionName'], setObj['object']);
        }
      });
    } else {
      // Server initialization
      Admin._serverGetAppCollections();
      Admin._initCollections();
      Admin._initFlag = true;
      while (Admin._initQueue.length) {
        var setObj = Admin._initQueue.shift();
        Admin.set(setObj['collectionName'], setObj['object']);
      }
    }
  },

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
      collectionObj.listFields = fields;
      collectionObj.editFields = fields;
      collectionObj.dataTypes = dataTypes;
    }
  },
                                   
  _initCollection: function(name, collection) {
    var collectionArray = Admin._collectionsArray;
    
    var collectionObj = {
      name: name,
      collection: collection
    };
    
    // Push the collection object into the collections array and into the collections object for fast and simple seek
    Admin._collectionsArray.push(collectionObj);
    Admin._collectionsObj[name] = collectionObj;
  },
  
  _clientGetAppCollections: function() {
    // Go through all global objects to find the collections
    for (var globalObject in window) { 
      // This was giving a deprecated error message, so just checking for it explicitly
      if (globalObject === "webkitStorageInfo")
        continue;
      if (window[globalObject] instanceof Meteor.Collection)
        Admin._initCollection(globalObject, window[globalObject]);
    }
  },

  _serverGetAppCollections: function() {
    var globals = Function('return this')();
    // Go through all global objects to find the collections
    for (var globalObject in globals) { 
      if (globals[globalObject] instanceof Meteor.Collection)
        Admin._initCollection(globalObject, globals[globalObject]);
    }
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    /*
     * Publications
     */
    Meteor.publish('adminData', function(collectionName) {
      var collection = Admin._collectionsObj[collectionName].collection;
      //console.log('publish:', collectionName);
      //this.onStop(function() {
      //  console.log('stop:', collectionName);
      //});
      return collection.find();
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

    var count = collectionObj.collection.update(_id, {$set: editDoc});

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
