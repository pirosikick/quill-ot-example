const path = require("path");
const HTMLPlugin = require("html-webpack-plugin");

const examples = ["local"];

/**
 * @type {Array<import('webpack').Configuration>}
 */
module.exports = examples.map((example) => ({
  entry: path.join(__dirname, "src/examples", example),
  output: {
    publicPath: `/${example}/`,
    path: path.join(__dirname, "dist", example)
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        options: {
          transpileOnly: true
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
      template: path.join(__dirname, "src/examples", example, "index.ejs")
    })
  ]
}));
