Template.adminMenu.helpers({
  collections: function() {
    return Admin._collectionsArray;
  },
  
  isEqual: function(v1, v2) {
    return v1 == v2;
  }
});

Template.adminList.helpers({
  printLabel: function(collectionName, fieldName) {
    var labels = Admin._collectionsObj[collectionName].labels;
    if (labels && labels[fieldName])
      return labels[fieldName];
    else
      return capitaliseFirstLetter(fieldName);
  },
  
  getRowContext: function(collectionName) {
    var collectionObj = Admin._collectionsObj[collectionName],
        a = mapDocToArray(collectionName, this, collectionObj.listFields, true);
    return {fields: a, collectionName: collectionName, _id: this._id};
  }
});

Template.adminEdit.helpers({
  admEditEachField: function(collectionName, options) {
    var collectionObj = Admin._collectionsObj[collectionName];

    return eachField({
      fields: collectionObj.editFields,
      doc: this,
      options: options,
      labels: collectionObj.labels,
      customEditFields: collectionObj.customEditFields
    });
  },

  getFieldsContext: function(collectionName) {
    var collectionObj = Admin._collectionsObj[collectionName],
        a = mapDocToArray(collectionName, this, collectionObj.editFields, false);
    return {fields: a, collectionName: collectionName, _id: this._id};
  }
});

Template.adminEditFields.helpers({
  isEqual: function(v1, v2) {
    return v1 == v2;
  },
});

Template.adminEdit.events({
  'submit form': function(e) {
    e.preventDefault();

    var _id = this.doc._id,
        collectionName = this.collectionName,
        collectionObj = Admin._collectionsObj[collectionName],
        dataTypes = collectionObj.dataTypes,
        field, value;

    var editDoc = {};
    for (var f in this.editFields) {
      field = this.editFields[f];
      value = $(e.target).find('[id="' + field + '"]').val();
      if (dataTypes && dataTypes[field])
        editDoc[field] = convertToDataType(value, dataTypes[field]);
      else
        editDoc[field] = value;
    }

    Meteor.call('adminUpdate', collectionName, editDoc, _id, function(error, count) {
      if (error)
        return alert(error.reason);
      Router.go('adminList', {name: collectionName});
    });
  },

  /*
  'click .delete': function(e) {
    e.preventDefault();

    if (confirm("Delete this post?")) {
      var currentPostId = this._id;
      Posts.remove(currentPostId);
      Router.go('postsList');
    }
  }
  */
});

/*
 * Functions
 */
function mapDocToArray(collectionName, doc, fields, isList) {
  var collectionObj = Admin._collectionsObj[collectionName],
      fieldsArray = [], first = true,
      field, fieldObj, value, path, editObj;
  
  for (var f in fields) {
    field = fields[f];
    
    if (collectionObj.customDisplayFields && collectionObj.customDisplayFields[field]) {
      value = collectionObj.customDisplayFields[field](doc[field], !isList);
    } else {
      path = field.split('.');
      value = doc;
      while (value && path.length) {
        value = value[path.shift()];
      }
    }

    fieldObj = {name: field, value: value, doc: doc, first: first};
    
    if (!isList && collectionObj.labels && collectionObj.labels[field])
      fieldObj.label = collectionObj.labels[field];
    else
      fieldObj.label = capitaliseFirstLetter(field);

    if (!isList && collectionObj.customEditFields && collectionObj.customEditFields[field]) {
      editObj = collectionObj.customEditFields[field];
      if (editObj.type == 'select') {
        fieldObj.select = true;
        fieldObj.options = editObj.options;
      } else if (editObj.type == 'reference') {
        fieldObj.select = true;
        var collection = Admin._collectionsObj[editObj.ref].collection;
        var docs = editObj.get(collection);
        fieldObj.options = docs.map(editObj.map);
      }
    }

    fieldsArray.push(fieldObj);

    first = false;
  }

  return fieldsArray;
}

/*
 *  Helper functions
 */
function convertToDataType(value, dataType) {
  if (!dataType)
    return value;

  switch(dataType) {
    case 'number':
      return Number(value);
    case 'boolean':
      return (value === 'true');
  }
  
  return value;
}

function capitaliseFirstLetter(string)
{
  return string.charAt(0).toUpperCase() + string.slice(1);
}
