var increment = 5;

Template.adminMenu.helpers({
  collections: function() {
    return Admin._collectionsArray;
  },
  
  isEqual: function(v1, v2) {
    return v1 == v2;
  }
});

Template.adminList.helpers({
  printLabel: printLabel,
  
  getRowContext: function(collectionName) {
    if (!collectionName)
      return;
    var collectionObj = Admin._collectionsObj[collectionName],
        a = mapDocToArray(collectionName, this, collectionObj.listFields, true);
    return {fields: a, collectionName: collectionName, _id: this._id};
  },
  
  hasMore: function() {
    var collectionName = this.collectionName,
        limit = Session.get('limit' + collectionName);
        //length = this.docs.fetch().length;
    //console.log(length, typeof length, limit, typeof limit);
    //console.log(length == limit);
    //return length == limit;
    return this.count == limit;
  }
});

Template.adminList.events({
  'click .clear': function(e, template) {
    e.preventDefault();
    Session.set('filter' + template.data.collectionName, {});
  },

  'click .load-more': function(e, template) {
    e.preventDefault();
    Session.set('limit' + template.data.collectionName,
                Session.get('limit' + template.data.collectionName) + increment);
  },

  'click .sort': function(e, template) {
    var field = $(e.target).attr('data-field'),
        currentSort = Session.get('sort' + template.data.collectionName),
        sortField, sortOrder, order = 'asc';

    e.preventDefault();

    if (currentSort.length > 0) {  // Ex.: [['name','asc']]
      sortField = currentSort[0][0];
      sortOrder = currentSort[0][1];
    }
    
    if (field == sortField) {
      if (sortOrder == 'asc')
        order = 'desc';
      else if (sortOrder == 'desc')
        field = null;
    }

    if (field)
      newSort = [[field, order]];
    else
      newSort = [];
    
     Session.set('sort' + template.data.collectionName, newSort);
  }
});

Template.adminSortOrder.helpers({
  isSort: function() {
    var field = this.field,
        collectionName = this.collectionName,
        currentSort = Session.get('sort' + collectionName);
    if (currentSort.length > 0)
      return field == currentSort[0][0];
    return false;
  },

  isAsc: function() {
    var collectionName = this.collectionName,
        currentSort = Session.get('sort' + collectionName);
    if (currentSort.length > 0)
      return 'asc' == currentSort[0][1];
    return false;
  }
});

Template.adminFilter.helpers({
  printLabel: printLabel,
  
  isActive: function(collectionName, field) {
    var filterObj = Session.get('filter' + collectionName);
    return filterObj[field] == this;
  }
});

Template.adminFilter.events({
  'click .filter': function(e, template) {
    var filter = {};
    e.preventDefault();
    filter[template.data.filter.field] = $(e.target).text();
    Session.set('filter' + template.data.collectionName, filter);
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
  getPluginTemplate: function() {
    return Template[this.template];
  },

  isEqual: function(v1, v2) {
    return v1 == v2;
  }
});

Template.adminEdit.events({
  //'submit form': function(e) {
  'click #save-btn': function(e) {
    e.preventDefault();

    var _id = this.doc._id,
        collectionName = this.collectionName,
        collectionObj = Admin._collectionsObj[collectionName],
        dataTypes = collectionObj.dataTypes,
        field, value;

    var editDoc = {};
    for (var f in this.editFields) {
      field = this.editFields[f];

      //value = $(e.target).find('[id="' + field + '"]').val();
      if (collectionObj.plugins && collectionObj.plugins[field] && collectionObj.plugins[field].getValue) {
        value = collectionObj.plugins[field].getValue(field);
      } else {
        value = $('#' + field).val();
      }

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

    // Plugins
    if (!isList && collectionObj.plugins && collectionObj.plugins[field]) {
      var plugin = collectionObj.plugins[field];
      fieldObj.template = plugin.template;
    }
    
    fieldsArray.push(fieldObj);

    first = false;
  }

  return fieldsArray;
}

function printLabel(collectionName, fieldName) {
  //console.log('collectionName=', collectionName);
  if (!collectionName)
    return;
  var labels = Admin._collectionsObj[collectionName].labels;
  if (labels && labels[fieldName])
    return labels[fieldName];
  else
    return capitaliseFirstLetter(fieldName);
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
