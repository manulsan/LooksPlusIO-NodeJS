exports.getRandom = (from, to, fixed) => {
  return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
};

exports.setEnv = (from, to, fixed) => {
  require("dotenv").config();

  var path = require("path");
  const dotenvExpand = require("dotenv-expand");
  dotenvExpand.expand(require("dotenv").config());
  dotenvExpand.expand(
    require("dotenv").config({
      path: path.join(__dirname, "..", `.env.${process.env.NODE_ENV}`),
    })
  );
};
