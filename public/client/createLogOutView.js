Shortly.createLogOutView = Backbone.View.extend({
  className: 'logOut',

  initialize: function() {
    this.render();
    // this.collection.on('sync', this.addAll, this);
    // this.collection.fetch();
  },

  render: function() {
    this.$el.empty().text('You logged out!');
    return this;
  },

  // addAll: function() {
  //   this.collection.forEach(this.addOne, this);
  // },

  // addOne: function(item) {
  //   var view = new Shortly.LinkView({ model: item });
  //   this.$el.append(view.render().el);
  // }
});
