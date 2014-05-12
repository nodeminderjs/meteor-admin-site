/*
 * Addresses plugin
 */
aspAddressesPlugin = {
  template: 'aspAddresses',
  
  getValue: function(field) {
    var value = [], obj;
    $("#asp-addresses").children().each(function() {
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
    return value;
  }
}

if (Meteor.isClient) {
  var delClick = function(e) {
    e.preventDefault();
    $(e.target).parent().parent().parent().remove();
    if ($("#asp-addresses").children().length === 0)
      newClick(e);
  }

  var newClick = function(e) {
    e.preventDefault();
    var address = $(".asp-blank-address .asp-address").clone().appendTo($("#asp-addresses"));
    $(".asp-btn-del", address).click(delClick);
  }

  Template.aspAddresses.events({
    'click .asp-btn-new': newClick
  });

  Template.aspAddress.events({
    'click .asp-btn-del': delClick
  });
}
