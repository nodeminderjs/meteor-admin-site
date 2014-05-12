/*
 * Tags plugin
 */
aspTagsPlugin = {
  template: 'aspTags',

  getValue: function(field) {
    var value = $('#' + field).val();
    return value.split(',').sort();
  }
}

