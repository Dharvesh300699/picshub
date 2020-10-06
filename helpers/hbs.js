const moment = require("moment");
module.exports = {
  isPublic: function (image) {
    return image.status === "public";
  },
  isPrivate: function (image) {
    return image.status === "private";
  },
  formatDate: function (date, format) {
    return moment(date).format(format);
  },
  profileOwner: function (imageOwner, loggedUser) {
    return imageOwner._id.toString() == loggedUser._id.toString();
  },
  truncate: function (str, len) {
    if (str.length > len && str.length > 0) {
      let new_str = str + " ";
      new_str = str.substr(0, len);
      new_str = str.substr(0, new_str.lastIndexOf(" "));
      new_str = new_str.length > 0 ? new_str : str.substr(0, len);
      return new_str + "...";
    }
    return str;
  },
  select: function (selected, options) {
    return options
      .fn(this)
      .replace(
        new RegExp(' value="' + selected + '"'),
        '$& selected="selected"'
      )
      .replace(
        new RegExp(">" + selected + "</option>"),
        ' selected="selected"$&'
      );
  },
};
