var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');


var HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
    template: "./index.html",
    filename: './index.html',
    inject: 'body'

    }
)

module.exports = {
    entry : "./src/index.ts",
    output : {
        filename : "bundle.js",
        path: path.resolve(__dirname, 'build')
    },
    devtool : "source-map",
    resolve : {
        extensions : [".webpack.config.js","web.js",".ts",".tsx",".js",".jsx",".d.ts"]
    },
    module : {
        rules: [{
            test: /\.tsx?$/,
            loader: 'ts-loader'
        }]
    },
    plugins : [HtmlWebpackPluginConfig]



};