Template.adminMenu.helpers({
  collections: function() {
    return Admin._collectionsArray;
  },

  admIfEquals: ifEquals 
});

Template.adminList.helpers({
  admListEachField: function(collectionName, options) {
    var collectionObj = Admin._collectionsObj[collectionName];

    return eachField({
      fields: collectionObj.listFields,
      doc: this,
      options: options,
      labels: collectionObj.labels,
      customFields: collectionObj.customFields
    });
  },

  admPrintLabel: function(collectionName, fieldName) {
    var labels = Admin._collectionsObj[collectionName].labels;
    if (labels && labels[fieldName])
      return labels[fieldName];
    else
      return capitaliseFirstLetter(fieldName);
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
      selectFields: collectionObj.selectFields,
      references: collectionObj.references
    });
  },

  admIfEquals: ifEquals 
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
function eachField(params) {
  var fields = params.fields,
      doc = params.doc,
      options = params.options,
      labels = params.labels,
      customFields = params.customFields,
      selectFields = params.selectFields,
      references = params.references,
      ret = '', 
      first = true,
      field, value, label, path, sel, selOpts;

  for (var f in fields) {
    field = fields[f];
    sel = false;

    if (customFields && customFields[field]) {
      value = customFields[field](doc[field]);
    } else {
      path = field.split('.');
      value = doc;
      while (path.length) {
        value = value[path.shift()];
      }
    }
    
    if (labels && labels[field])
      label = labels[field];
    else
      label = capitaliseFirstLetter(field);

    if (selectFields && selectFields[field]) {
      sel = true;
      selOpts = selectFields[field].options;
    } else {
      if (references && references[field]) {
        sel = true;
        var refObj = references[field];
        var collection = Admin._collectionsObj[refObj.ref].collection;
        var docs = refObj.get(collection);
        selOpts = docs.map(refObj.map);
      }
    }

    ret = ret + options.fn({
      field: field,
      value: value,
      label: label,
      doc: doc,
      first: first,
      select: sel,
      options: selOpts
    });

    first = false;
  }

  return ret;
}

function ifEquals(v1, v2, html) { 
  if (v1 == v2)
    return new Handlebars.SafeString(html);
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
