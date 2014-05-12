/*
 * Addresses plugin
 */

AddressesPlugin = {
  template: 'addressesPlugin',
  getValue: function() {
    var value = [], obj;
    $("#addresses").children().each(function() {
      obj = {};
      obj['street1'] = $(".street1", this).val().trim();  // 'this' is the current element in the loop
      if (obj['street1']) {
        obj['street2'] = $(".street2", this).val().trim();
        obj['city']    = $(".city", this).val().trim();
        obj['state']   = $(".state", this).val().trim();
        obj['zip']     = $(".zip", this).val().trim();
        obj['country'] = $(".country", this).val().trim();
        value.push(obj);
      }
    });
    console.log(value);
    return value;
  }
}

if (Meteor.isClient) {
  var newClick = function(e) {
    e.preventDefault();
    var address = $(".blank-address .address").clone().appendTo($("#addresses"));
    $(".del", address).click(delClick);
  }

  var delClick = function(e) {
    e.preventDefault();
    $(e.target).parent().parent().parent().remove();
    if ($("#addresses").children().length === 0)
      newClick(e);
  }
  
  Template.addressesPlugin.events({
    'click .new': newClick
  });

  Template.address.events({
    'click .del': delClick
  });
}
