const path = require("path");
const HTMLPlugin = require("html-webpack-plugin");

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  entry: path.resolve(__dirname, "./src/index.ts"),
  output: {
    publicPath: "/examples/local/"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  plugins: [
    new HTMLPlugin({
      template: path.resolve(__dirname, "./src/index.ejs")
    })
  ]
};
